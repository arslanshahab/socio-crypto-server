import {StripeAPI} from "../clients/stripe";
import {Org} from "../models/Org";
import {asyncHandler, BN, USD_PER_COIIN} from "../util/helpers";
import {Request, Response} from "express";
import {Secrets} from "../util/secrets";
import {Transfer} from "../models/Transfer";
import {PaymentIntent} from "../types";
import {updateOrgCampaignsStatusOnDeposit} from "./helpers";

export const addPaymentMethod = async (parent: any, args: any, context: { user: any }) => {
  const {company} = context.user;
  const org = await Org.findOne({where: {name: company}});
  if (!org) throw new Error('org not found');
  if (!org.stripeId) {
    const customer = await StripeAPI.createCustomer();
    org.stripeId = customer.id;
    await org.save();
  }
  const intent = await StripeAPI.setupIntent(org.stripeId);
  return {clientSecret: intent.client_secret}
}

export const deletePaymentMethod = async (_: any, args: { paymentMethodId: string }, context: { user: any }) => {
  const {company} = context.user;
  const { paymentMethodId } = args;
  const org = await Org.findOne({where: {name: company}});
  if (!org) throw new Error('org not found');
  if (!org.stripeId) throw new Error('missing stripe ID');
  const { customer } = await StripeAPI.getPaymentMethod(paymentMethodId);
  if (customer !== org.stripeId) throw new Error('card not registered');
  await StripeAPI.removePaymentMethod(paymentMethodId);
  return true;
}

export const listPaymentMethods = async (_: any, args: any, context: {user: any}) => {
  const {company} = context.user;
  const org = await Org.findOne({where: {name: company}});
  if (!org) throw new Error('org not found');
  const paymentMethods = await StripeAPI.listPaymentMethods(org.stripeId);
  return paymentMethods.data.map(method => {
    return {
      id: method.id,
      last4: method.card?.last4,
      brand: method.card?.brand
    }
  })
}

export const purchaseCoiin = async (parent: any, args: {amount: number, paymentMethodId: string}, context: { user: any }) => {
  const {company} = context.user;
  const {amount, paymentMethodId} = args;
  const org = await Org.findOne({where: {name: company}, relations: ['fundingWallet']});
  if (!org) throw new Error('org not found');
  const amountInDollar = new BN(amount).times(.1);
  const transfer = Transfer.newPendingUsdDeposit(org.fundingWallet, org, amountInDollar, org.stripeId);
  await transfer.save();
  const amountInCents = amountInDollar.times(100);
  return await StripeAPI.chargePaymentMethod(amountInCents.toString(), org.stripeId, paymentMethodId, transfer.id);
}

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  let event;
  let transfer;
  try {
    if (!sig) throw new Error('missing signature');
    event = await StripeAPI.constructWebhookEvent(req.body, sig, Secrets.stripeWebhookSecret);
    const paymentIntent = event.data.object as PaymentIntent;
    if (paymentIntent.metadata.stage !== process.env.NODE_ENV) return res.status(200).json({received: true})
    switch (event.type) {
      case 'payment_intent.succeeded':
        const amountInDollars = new BN(paymentIntent.amount).div(100);
        transfer = await Transfer.findOne({where: {id: paymentIntent.metadata.transferId}, relations: ['fundingWallet']});
        if (!transfer) throw new Error('transfer not found');
        transfer.status = 'SUCCEEDED';
        const amountInCoiin = amountInDollars.div(USD_PER_COIIN);
        transfer.fundingWallet.balance = transfer.fundingWallet.balance.plus(amountInCoiin);
        await transfer.fundingWallet.save();
        await transfer.save();
        await updateOrgCampaignsStatusOnDeposit(transfer.fundingWallet);
        break;
      case 'payment_intent.payment_failed':
        console.log('PaymentIntent failed!');
        transfer = await Transfer.findOne({where: {id: paymentIntent.metadata.transferId}, relations: ['fundingWallet']});
        if (!transfer) throw new Error('transfer not found');
        transfer.status = "FAILED";
        await transfer.save();
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    return res.status(200).json({received: true});
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
  return;
});
