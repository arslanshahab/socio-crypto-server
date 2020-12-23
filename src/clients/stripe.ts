import {Secrets} from "../util/secrets";
import Stripe from 'stripe';

const {NODE_ENV = 'development'} = process.env;

export class StripeAPI {
  public static client: Stripe;

  public static initialize() {
    StripeAPI.client = new Stripe(Secrets.stripeApiKey, {apiVersion: "2020-08-27"});
  }

  public static async createCustomer() {
    return StripeAPI.client.customers.create();
  }

  public static async setupIntent(customerId: string) {
    return StripeAPI.client.setupIntents.create({
      customer: customerId
    })
  }

  public static async constructWebhookEvent(payload: string | Buffer, header: string | Buffer | Array<string>, secret: string) {
    return StripeAPI.client.webhooks.constructEvent(payload, header, secret);
  }

  public static async chargePaymentMethod(amount: string, customerId: string, paymentMethodId: string, transferId: string) {
    try {
      const paymentIntent = await StripeAPI.client.paymentIntents.create({
        amount: parseFloat(amount),
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: false,
        confirm: true,
        metadata: {
          transferId,
          stage: NODE_ENV
        }
      });
      return paymentIntent.client_secret
    } catch (err) {
      console.log('Error code is: ', err.code);
      const paymentIntentRetrieved = await StripeAPI.client.paymentIntents.retrieve(err.raw.payment_intent.id);
      console.log('PI retrieved: ', paymentIntentRetrieved.id);
    }
    return;
  }

  public static async listPaymentMethods(customerId: string) {
    return StripeAPI.client.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
  }

  public static async removePaymentMethod(paymentMethodId: string) {
    return StripeAPI.client.paymentMethods.detach(paymentMethodId);
  }

}
