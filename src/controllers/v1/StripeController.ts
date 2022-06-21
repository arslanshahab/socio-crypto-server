import { Controller, Inject } from "@tsed/di";
import { Get, Returns } from "@tsed/schema";
import { SuccessArrayResult } from "../../util/entities";
import { UserService } from "../../services/UserService";
import { Context } from "@tsed/common";
import { OrganizationService } from "../../services/OrganizationService";
import { ORG_NOT_FOUND } from "../../util/errors";
import { StripeAPI } from "../../clients/stripe";
import { NotFound } from "@tsed/exceptions";
import { PaymentMethodsResultModel } from "../../models/RestModels";

@Controller("/stripe")
export class StripeController {
    @Inject()
    private userService: UserService;
    @Inject()
    private organizationService: OrganizationService;

    @Get("/payment-methods")
    @(Returns(200, SuccessArrayResult).Of(Object))
    public async listPaymentMethods(@Context() context: Context) {
        const { company } = await this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        if (!company) throw new Error("company not found for this user");
        const org = await this.organizationService.findOrganizationByCompanyName(company);
        if (!org) throw new Error(ORG_NOT_FOUND);
        if (!org.stripeId) throw new NotFound("missing stripe id for this organization");
        const paymentMethods = await StripeAPI.listPaymentMethods(org.stripeId);
        const result = paymentMethods.data.map((method) => ({
            id: method.id,
            last4: method.card?.last4,
            brand: method.card?.brand,
        }));
        return new SuccessArrayResult(result, PaymentMethodsResultModel);
    }
}
