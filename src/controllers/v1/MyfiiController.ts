import { BodyParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { Enum, Post, Required, CollectionOf, Returns } from "@tsed/schema";
import { BooleanResultModel } from "src/models/RestModels.ts";
import { FactorRequestStatus } from "../../util/constants";
import { SuccessResult } from "../../util/entities";
import { UserService } from "../../services/UserService";
import { NotFound } from "@tsed/exceptions";
import { USER_NOT_FOUND } from "src/util/errors.ts";
import { FactorService } from "../../services/FactorService";

export class ApprovedFactor {
    @Required()
    public readonly factorName: string;

    @Required()
    public readonly factorType: string;

    @Required()
    public readonly factorData: string;
}

export class WebhookBody {
    @Required()
    public readonly userPublicKey: string;

    @Required()
    public readonly providerId: string;

    @Required()
    public readonly referenceId: string;

    @CollectionOf(ApprovedFactor)
    @Required()
    public readonly factors: ApprovedFactor[];

    @Required()
    @Enum(FactorRequestStatus)
    public readonly status: FactorRequestStatus;
}

@Controller("/myfii")
@(Returns(200, SuccessResult).Of(BooleanResultModel))
export class MyfiiController {
    @Inject()
    private userService: UserService;
    @Inject()
    private factorService: FactorService;

    @Post("/webhook")
    public async webhook(@BodyParams() body: WebhookBody) {
        const user = await this.userService.findUserById(body.referenceId);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        await this.factorService.createMany(body, user.id);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }
}
