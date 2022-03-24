import { Get, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context } from "@tsed/common";
import { BadRequest } from "@tsed/exceptions";
import { UserService } from "../../services/UserService";
import { SuccessResult } from "../../util/entities";
import { USER_NOT_FOUND } from "../../util/errors";
import { UserResultModel } from "../../models/RestModels";

@Controller("/user")
export class UserController {
    @Inject()
    private userService: UserService;

    @Get("/me")
    @(Returns(200, SuccessResult).Of(UserResultModel))
    public async me(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), [
            "profile",
            "social_link",
            "participant",
            "notification_settings",
            "wallet",
            "xoxoday_order",
        ]);
        if (!user) throw new BadRequest(USER_NOT_FOUND);

        const userResult: UserResultModel | null = user;
        if (userResult.profile) userResult.profile.hasRecoveryCodeSet = !!user.profile?.recoveryCode;

        return new SuccessResult(userResult, UserResultModel);
    }
}
