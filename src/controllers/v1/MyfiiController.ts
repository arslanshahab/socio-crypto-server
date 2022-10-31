import { BodyParams } from "@tsed/common";
import { Controller } from "@tsed/di";
import { Enum, Post, Required, CollectionOf, Returns } from "@tsed/schema";
import { BooleanResultModel } from "src/models/RestModels.ts";
import { FactorRequestStatus } from "../../util/constants";
import { SuccessResult } from "../../util/entities";

export class ApprovedFactor {
    @Required()
    public readonly factorName: string;

    @Required()
    public readonly factorType: string;

    @Required()
    public readonly factorData: string;
}

export class WebhookBody {
    @Required() public readonly userPublicKey: string;
    @Required() public readonly providerId: string;

    @CollectionOf(ApprovedFactor) @Required() public readonly factors: ApprovedFactor[];

    @Required() @Enum(FactorRequestStatus) public readonly status: FactorRequestStatus;
}

@Controller("/myfii")
@(Returns(200, SuccessResult).Of(BooleanResultModel))
export class MyfiiController {
    @Post("/webhook")
    public async webhook(@BodyParams() body: WebhookBody) {
        return new SuccessResult({ success: true }, BooleanResultModel);
    }
}
