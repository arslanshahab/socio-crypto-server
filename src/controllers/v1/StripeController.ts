import { Controller, Inject } from "@tsed/di";
import { Get, Post, Property, Required, Returns } from "@tsed/schema";
import { SuccessArrayResult, SuccessResult } from "../../util/entities";
import { BodyParams, Context, Req, Res } from "@tsed/common";
import { OrganizationService } from "../../services/OrganizationService";
import { ORG_NOT_FOUND, TRANSFER_NOT_FOUND, WALLET_NOT_FOUND } from "../../util/errors";
import { StripeAPI } from "../../clients/stripe";
import { BadRequest, NotFound } from "@tsed/exceptions";
import {
    BooleanResultModel,
    PaymentMethodsResultModel,
    PurchaseCoiinResultModel,
    UpdatedResultModel,
} from "../../models/RestModels";
import { TransferService } from "../../services/TransferService";
import { getTokenValueInUSD } from "../../util/exchangeRate";
import {
    ADMIN,
    BSC,
    COIIN,
    RAIINMAKER_ORG_NAME,
    TransferAction,
    TransferStatus,
    TransferType,
} from "../../util/constants";
import { AdminService } from "../../services/AdminService";
import { Secrets } from "../../util/secrets";
import { PaymentIntent } from "../../../types";
import { TatumService } from "../../services/TatumService";
import { CurrencyService } from "../../services/CurrencyService";
import { TokenService } from "../../services/TokenService";
import { WalletService } from "../../services/WalletService";

class PurchaseCoiinParams {
    @Required() public readonly amount: number;
    @Required() public readonly paymentMethodId: string;
}

class StripeResultModel {
    @Property() public readonly clientSecret: string;
}

class RemovePaymentMethodParams {
    @Property() public readonly paymentMethodId: string;
}

@Controller("/")
export class StripeController {
    @Inject()
    private organizationService: OrganizationService;
    @Inject()
    private transferService: TransferService;
    @Inject()
    private adminService: AdminService;
    @Inject()
    private tatumService: TatumService;
    @Inject()
    private currencyService: CurrencyService;
    @Inject()
    private tokenService: TokenService;
    @Inject()
    private walletService: WalletService;

    @Get("/stripe/payment-methods")
    @(Returns(200, SuccessArrayResult).Of(PaymentMethodsResultModel))
    public async listPaymentMethods(@Context() context: Context) {
        const { company } = await this.adminService.checkPermissions({ hasRole: [ADMIN] }, context.get("user"));
        if (!company) throw new NotFound("company not found for this user");
        const org = await this.organizationService.findOrganizationByName(company);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        if (!org.stripeId) throw new NotFound("missing stripe id for this organization");
        const paymentMethods = await StripeAPI.listPaymentMethods(org.stripeId);
        const result = paymentMethods.data.map((method) => ({
            id: method.id,
            last4: method.card?.last4,
            brand: method.card?.brand,
        }));
        return new SuccessArrayResult(result, PaymentMethodsResultModel);
    }

    @Post("/stripe/purchase-coiin")
    @(Returns(200, SuccessResult).Of(PurchaseCoiinResultModel))
    public async purchaseCoiin(@BodyParams() body: PurchaseCoiinParams, @Context() context: Context) {
        const { company } = await this.adminService.checkPermissions({ hasRole: [ADMIN] }, context.get("user"));
        if (!company) throw new NotFound("company not found for this user");
        const org = await this.organizationService.findOrganizationByName(company, { wallet: true });
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const { amount, paymentMethodId } = body;
        const amountInDollar = await getTokenValueInUSD(COIIN, amount);
        const transfer = await this.transferService.usdDeposit({
            walletId: org.wallet?.id!,
            orgId: org.id,
            type: TransferType.DEBIT,
            amount: amountInDollar.toString(),
            stripeCardId: org.stripeId || "",
        });
        const result = await StripeAPI.chargePaymentMethod(
            (amountInDollar * 100).toString(),
            org.stripeId!,
            paymentMethodId,
            transfer.id
        );
        let confirmPayment;
        const raiinmakerOrg = await this.organizationService.findOrganizationByName(RAIINMAKER_ORG_NAME, {
            wallet: true,
        });
        if (!raiinmakerOrg) throw new NotFound("RAIINMAKER " + ORG_NOT_FOUND);
        if (!raiinmakerOrg.wallet) throw new NotFound("RAIINMAKER ORG " + WALLET_NOT_FOUND);
        if (result?.id) {
            confirmPayment = await StripeAPI.confirmPayment(result.id);
            await this.transferService.usdDeposit({
                walletId: raiinmakerOrg.wallet.id,
                orgId: raiinmakerOrg.id,
                type: TransferType.CREDIT,
                amount: amountInDollar.toString(),
                stripeCardId: raiinmakerOrg.stripeId || "",
            });
        }
        if (confirmPayment?.status === "succeeded") return new SuccessResult(result, PurchaseCoiinResultModel);
        else return new SuccessResult({ message: "Stripe payment failed!" }, UpdatedResultModel);
    }

    @Post("/stripe/add-payment-method")
    @(Returns(200, SuccessResult).Of(StripeResultModel))
    public async addPaymentMethod(@Context() context: Context) {
        const { company } = await this.adminService.checkPermissions({ hasRole: [ADMIN] }, context.get("user"));
        if (!company) throw new NotFound("company not found for this user");
        let org = await this.organizationService.findOrganizationByName(company);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        if (!org.stripeId) {
            const stripe = await StripeAPI.createCustomer();
            org = await this.organizationService.initStripeId(org.id, stripe.id);
        }
        const intent = await StripeAPI.setupIntent(org.stripeId!);
        return new SuccessResult({ clientSecret: intent.client_secret }, StripeResultModel);
    }

    @Post("/stripe/remove-payment-method")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async removePaymentMethod(@BodyParams() body: RemovePaymentMethodParams, @Context() context: Context) {
        const { company } = await this.adminService.checkPermissions({ hasRole: [ADMIN] }, context.get("user"));
        if (!company) throw new NotFound("company not found for this user");
        const org = await this.organizationService.findOrganizationByName(company);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        if (!org.stripeId) throw new NotFound("missing stripe id for this organization");
        const { paymentMethodId } = body;
        const { customer } = await StripeAPI.getPaymentMethod(paymentMethodId);
        if (customer !== org.stripeId) throw new BadRequest("card not registered");
        await StripeAPI.removePaymentMethod(paymentMethodId);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Post("/payments")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async stripeWebhook(@Req() req: Req, @Res() res: Res) {
        const sig = req.headers["stripe-signature"];
        let event;
        let transfer;
        if (!sig) throw new Error("missing signature");
        event = await StripeAPI.constructWebhookEvent(req.body, sig, Secrets.stripeWebhookSecret);
        const paymentIntent = event.data.object as PaymentIntent;
        switch (event.type) {
            case "payment_intent.succeeded":
                transfer = await this.transferService.findTransferById(paymentIntent.metadata.transferId);
                const amountInDollar = paymentIntent.amount / 100;
                if (!transfer) throw new Error(TRANSFER_NOT_FOUND);
                await this.transferService.updateTransferStatus(transfer.id, TransferStatus.SUCCEEDED);
                const amountInCoiins = amountInDollar / parseFloat(process.env.COIIN_VALUE || "0.2");
                const token = await this.tokenService.findTokenBySymbol({ symbol: COIIN, network: BSC });
                const orgCurrency = await this.currencyService.findCurrencyByTokenAndWallet({
                    tokenId: token?.id!,
                    walletId: transfer.walletId!,
                });
                const raiinmaker = await this.organizationService.findOrganizationByName(RAIINMAKER_ORG_NAME);
                if (!raiinmaker) throw new NotFound(ORG_NOT_FOUND);
                const raiinmakerWallet = await this.walletService.findWalletByOrgId(raiinmaker?.id);
                if (!raiinmakerWallet) throw new NotFound(WALLET_NOT_FOUND + " for organization");
                const raiinmakerCurrency = await this.currencyService.findCurrencyByTokenAndWallet({
                    tokenId: token?.id!,
                    walletId: raiinmakerWallet.id,
                });
                const { availableBalance } = await this.tatumService.getAccountBalance(raiinmakerCurrency?.tatumId!);
                let coiinTransferStatus = TransferStatus.PENDING;
                if (parseFloat(availableBalance) > amountInCoiins) {
                    await this.tatumService.transferFunds({
                        senderAccountId: raiinmakerCurrency?.tatumId!,
                        recipientAccountId: orgCurrency?.tatumId!,
                        amount: amountInCoiins.toString(),
                        recipientNote: "Transfer credit card coiin",
                    });
                    coiinTransferStatus = TransferStatus.SUCCEEDED;
                }

                // If the coiinTransferStatus is pending, it will be handle the fix-transfers cron
                await this.transferService.newReward({
                    action: TransferAction.COIIN_PURCHASE,
                    amount: amountInCoiins.toString(),
                    status: coiinTransferStatus,
                    symbol: COIIN,
                    type: TransferType.CREDIT,
                    walletId: transfer.walletId!,
                });
                await this.transferService.newReward({
                    action: TransferAction.COIIN_PURCHASE,
                    amount: amountInCoiins.toString(),
                    status: coiinTransferStatus,
                    symbol: COIIN,
                    type: TransferType.DEBIT,
                    walletId: raiinmakerWallet.id,
                });
                break;
            case "payment_intent.payment_failed":
                transfer = await this.transferService.findTransferById(paymentIntent.metadata.transferId);
                if (!transfer) throw new Error(TRANSFER_NOT_FOUND);
                await this.transferService.updateTransferStatus(transfer.id, TransferStatus.FAILED);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        return res.status(200).json({ received: true });
    }
}
