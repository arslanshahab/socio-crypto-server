import { BodyParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { Enum, Post, Required, Returns } from "@tsed/schema";
import {
    ACCOUNT_RESTRICTED,
    EMAIL_EXISTS,
    EMAIL_NOT_EXISTS,
    INCORRECT_CODE,
    INCORRECT_PASSWORD,
    MISSING_PARAMS,
    USERNAME_EXISTS,
    USERNAME_NOT_EXISTS,
    USER_NOT_FOUND,
} from "../../util/errors";
import {
    BooleanResultModel,
    LoginParams,
    RecoverUserAccountStep1Parms,
    RecoverUserAccountStep2Parms,
    RegisterUserParams,
    ResetUserPasswordParams,
    UserTokenReturnModel,
} from "../../models/RestModels";
import { SuccessResult } from "../../util/entities";
import { UserService } from "../../services/UserService";
import { createPasswordHash, createSessionTokenV2 } from "../../util";
import { ProfileService } from "../../services/ProfileService";
import { VerificationService } from "../../services/VerificationService";
import { JWTPayload } from "../../types";
import { VerificationType } from "../../util/constants";
import { SesClient } from "../../clients/ses";

export class StartVerificationParams {
    @Required() public readonly email: string;
    @Required() @Enum(VerificationType) public readonly type: VerificationType | undefined;
}

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

    @Post("/reset-user-password")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async resetUserPassword(@BodyParams() body: ResetUserPasswordParams) {
        const { verificationToken, password } = body;
        if (!verificationToken || !password) throw new NotFound(MISSING_PARAMS);
        const verificationData = await this.verificationService.verifyToken({ verificationToken });
        const user = await this.userService.findUserByEmail(verificationData.email);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        await this.userService.resetUserPassword(user.id, user.email, password);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Post("/recover-user-account-step1")
    @(Returns(200, SuccessResult).Of(UserTokenReturnModel))
    public async recoverUserAccountStep1(@BodyParams() body: RecoverUserAccountStep1Parms) {
        const { username, code } = body;
        if (!username || !code) throw new NotFound(MISSING_PARAMS);
        const profile = await this.profileService.findProfileByUsername(username);
        if (!profile) throw new NotFound(USERNAME_NOT_EXISTS);
        if (!(await this.profileService.isRecoveryCodeValid(username, code))) throw new BadRequest(INCORRECT_CODE);
        if (!profile.user) throw new NotFound(USER_NOT_FOUND);
        if (!profile.user.email) return { userId: profile.user.id };
        else return new SuccessResult({ token: createSessionTokenV2(profile.user) }, UserTokenReturnModel);
    }

    @Post("/recover-user-account-step2")
    @(Returns(200, SuccessResult).Of(UserTokenReturnModel))
    public async recoverUserAccountStep2(@BodyParams() body: RecoverUserAccountStep2Parms) {
        const { email, password, userId, verificationToken } = body;
        const user = await this.userService.findUserById(userId);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        await this.verificationService.verifyToken({ verificationToken, email });
        if (user.email) throw new BadRequest(EMAIL_EXISTS);
        await this.userService.updateEmailPassword(email, createPasswordHash({ email, password }));
        return new SuccessResult({ token: createSessionTokenV2(user) }, UserTokenReturnModel);
    }

    @Post("/start-verification")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async startVerification(@BodyParams() body: StartVerificationParams) {
        const { email, type } = body;
        if (!email || !type) throw new BadRequest(MISSING_PARAMS);
        const userWithEmail = await this.userService.updatedUserEmail(email);
        if (type === "EMAIL" && userWithEmail) throw new BadRequest(EMAIL_EXISTS);
        if (type === "PASSWORD" && !userWithEmail) throw new BadRequest(EMAIL_NOT_EXISTS);
        if (type === "WITHDRAW" && !userWithEmail) throw new BadRequest(EMAIL_NOT_EXISTS);
        const verificationData = await this.verificationService.generateVerification({ email, type });
        await SesClient.emailAddressVerificationEmail(
            email,
            this.verificationService.getDecryptedCode(verificationData.code)
        );
        return new SuccessResult({ success: true }, BooleanResultModel);
    }
}
