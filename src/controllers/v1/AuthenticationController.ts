import { BodyParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { BadRequest } from "@tsed/exceptions";
import { Post, Returns } from "@tsed/schema";
import { ACCOUNT_RESTRICTED, EMAIL_NOT_EXISTS, INCORRECT_PASSWORD, MISSING_PARAMS } from "../../util/errors";
import { LoginParams, UserLoginResultModel } from "../../models/RestModels";
import { SuccessResult } from "../../util/entities";
import { UserService } from "../../services/UserService";
import { createPasswordHash, createSessionTokenV2 } from "../../util";

@Controller("/auth")
export class AuthenticationController {
    @Inject()
    private userService: UserService;

    @Post("/login")
    @(Returns(200, SuccessResult).Of(UserLoginResultModel))
    public async loginUser(@BodyParams() body: LoginParams) {
        try {
            const { email, password } = body;
            if (!email || !password) throw new BadRequest(MISSING_PARAMS);
            const user = await this.userService.findUserByEmail(email);
            if (!user) throw new BadRequest(EMAIL_NOT_EXISTS);
            if (!user.active) throw new BadRequest(ACCOUNT_RESTRICTED);
            if (user.password !== createPasswordHash({ email, password })) throw new Error(INCORRECT_PASSWORD);
            await this.userService.updateLastLogin(user.id);
            await this.userService.transferCoiinReward({ user, type: "LOGIN_REWARD" });
            return new SuccessResult({ token: createSessionTokenV2(user) }, UserLoginResultModel);
        } catch (error) {
            return new BadRequest(error.message);
        }
    }
}
