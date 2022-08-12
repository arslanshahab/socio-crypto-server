import { Controller, Inject } from "@tsed/di";
import { Delete, Get, Post, Property, Required, Returns } from "@tsed/schema";
import { SuccessArrayResult, SuccessResult } from "../../util/entities";
import { BodyParams, Context } from "@tsed/common";
import { OrganizationService } from "../../services/OrganizationService";
import { ORG_NOT_FOUND } from "../../util/errors";
import { StripeAPI } from "../../clients/stripe";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { BooleanResultModel, PaymentMethodsResultModel } from "../../models/RestModels";
import { TransferService } from "../../services/TransferService";
import { getTokenValueInUSD } from "../../util/exchangeRate";
import { COIIN } from "../../util/constants";
import { AdminService } from "../../services/AdminService";

class PurchaseCoiinParams {
    @Required() public readonly amount: number;
    @Required() public readonly paymentMethodId: string;
    @Property() public readonly campaignId: string;
}

class StripeResultModel {
    @Property() public readonly clientSecret: string;
}

class RemovePaymentMethodParams {
    @Property() public readonly paymentMethodId: string;
}

@Controller("/stripe")
export class StripeController {
    @Inject()
    private organizationService: OrganizationService;
    @Inject()
    private transferService: TransferService;
    @Inject()
    private adminService: AdminService;

    @Get("/payment-methods")
    @(Returns(200, SuccessArrayResult).Of(PaymentMethodsResultModel))
    public async listPaymentMethods(@Context() context: Context) {
        const { company } = await this.adminService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
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

    @Post("/purchase-coiin")
    @(Returns(200, SuccessResult).Of(StripeResultModel))
    public async purchaseCoiin(@BodyParams() body: PurchaseCoiinParams, @Context() context: Context) {
        const { company } = await this.adminService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        if (!company) throw new NotFound("company not found for this user");
        const org = await this.organizationService.findOrganizationByName(company, { wallet: true });
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const { amount, paymentMethodId } = body;
        const amountInDollar = await getTokenValueInUSD(COIIN, amount);
        const transfer = await this.transferService.newPendingUsdDeposit(
            org.wallet?.id!,
            org.id,
            amountInDollar.toString(),
            org.stripeId!
        );
        return await StripeAPI.chargePaymentMethod(
            amountInDollar.toString(),
            org.stripeId!,
            paymentMethodId,
            transfer.id
        );
    }

    @Post("/add-payment-method")
    @(Returns(200, SuccessResult).Of(StripeResultModel))
    public async addPaymentMethod(@Context() context: Context) {
        const { company } = await this.adminService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
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

    @Delete("/remove-payment-method")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async removePaymentMethod(@BodyParams() body: RemovePaymentMethodParams, @Context() context: Context) {
        const { company } = await this.adminService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
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
}
