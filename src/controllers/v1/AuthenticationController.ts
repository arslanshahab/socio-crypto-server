import { BodyParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { Post, Returns } from "@tsed/schema";
import {
    ACCOUNT_RESTRICTED,
    EMAIL_EXISTS,
    EMAIL_NOT_EXISTS,
    INCORRECT_PASSWORD,
    MISSING_PARAMS,
    USERNAME_EXISTS,
    USER_NOT_FOUND,
} from "../../util/errors";
import { LoginParams, RegisterUserParams, UserTokenReturnModel } from "../../models/RestModels";
import { SuccessResult } from "../../util/entities";
import { UserService } from "../../services/UserService";
import { createPasswordHash, createSessionTokenV2 } from "../../util";
import { ProfileService } from "../../services/ProfileService";
import { VerificationService } from "../../services/VerificationService";
import { JWTPayload } from "../../types";

@Controller("/auth")
export class AuthenticationController {
    @Inject()
    private userService: UserService;
    @Inject()
    private profileService: ProfileService;
    @Inject()
    private verificationService: VerificationService;

    @Post("/register-user")
    @(Returns(200, SuccessResult).Of(UserTokenReturnModel))
    public async registerUser(@BodyParams() body: RegisterUserParams) {
        const { email, username, password, verificationToken, referralCode } = body;
        if (!email || !password || !username || !verificationToken) throw new BadRequest(MISSING_PARAMS);
        if (await this.userService.findUserByEmail(email)) throw new BadRequest(EMAIL_EXISTS);
        if (await this.profileService.findProfileByUsername(username)) throw new BadRequest(USERNAME_EXISTS);
        await this.verificationService.verifyToken({ verificationToken, email });
        const userId = await this.userService.initNewUser(email, username, password, referralCode);
        const user = await this.userService.findUserByContext({ userId } as JWTPayload, ["wallet"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        return new SuccessResult({ token: createSessionTokenV2(user) }, UserTokenReturnModel);
    }

    @Post("/user-login")
    @(Returns(200, SuccessResult).Of(UserTokenReturnModel))
    public async loginUser(@BodyParams() body: LoginParams) {
        const { email, password } = body;
        if (!email || !password) throw new BadRequest(MISSING_PARAMS);
        const user = await this.userService.findUserByEmail(email);
        if (!user) throw new BadRequest(EMAIL_NOT_EXISTS);
        if (!user.active) throw new BadRequest(ACCOUNT_RESTRICTED);
        if (user.password !== createPasswordHash({ email, password })) throw new Error(INCORRECT_PASSWORD);
        await this.userService.updateLastLogin(user.id);
        await this.userService.transferCoiinReward({ user, type: "LOGIN_REWARD" });
        return new SuccessResult({ token: createSessionTokenV2(user) }, UserTokenReturnModel);
    }
}
