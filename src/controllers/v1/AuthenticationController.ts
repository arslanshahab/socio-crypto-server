import { BodyParams, QueryParams, Request, Response } from "@tsed/common";
import { Request as ExpressRequest } from "express";
import { Controller, Inject } from "@tsed/di";
import { BadRequest, Forbidden, NotFound, Unauthorized } from "@tsed/exceptions";
import { Enum, Post, Get, Property, Required, Returns, Put } from "@tsed/schema";
import {
    ACCOUNT_RESTRICTED,
    ADMIN_NOT_FOUND,
    EMAIL_EXISTS,
    EMAIL_NOT_EXISTS,
    INCORRECT_CODE,
    INCORRECT_PASSWORD,
    INVALID_TOKEN,
    MISSING_PARAMS,
    USERNAME_EXISTS,
    USERNAME_NOT_EXISTS,
    USER_NOT_FOUND,
} from "../../util/errors";
import {
    AdminResultModel,
    BooleanResultModel,
    CompleteVerificationParams,
    CompleteVerificationResultModel,
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
import { JWTPayload } from "types.d.ts";
import { UserRewardType, VerificationType } from "../../util/constants";
import { SesClient } from "../../clients/ses";
import { Firebase } from "../../clients/firebase";
import { SessionService } from "../../services/SessionService";
import { AdminService } from "../../services/AdminService";
// import { doFetch, RequestData } from "../../util/fetchRequest";
// import sha256 from "crypto-js/sha256";
// import hmacSHA512 from "crypto-js/hmac-sha512";
// import Base64 from "crypto-js/enc-base64";
// const qs = require("qs");
// import * as crypto from "crypto-js";
// const crypto = require("crypto");
// import crypto from "crypto";

export class StartVerificationParams {
    @Required() public readonly email: string;
    @Required() @Enum(VerificationType) public readonly type: VerificationType | undefined;
    @Property() public readonly admin: boolean;
}
class UserIdResultModel {
    @Property() public readonly userId: string;
}
class RecoverUserAccountResultModel extends UserTokenReturnModel {
    @Property() public readonly userId: string;
}
class UsernameExistsParams {
    @Required() public readonly username: string;
}

class UpdateAdminPasswordParams {
    @Required() public readonly idToken: string;
    @Required() public readonly password: string;
}

class ForgetAdminPasswordParams {
    @Required() public readonly email: string;
    @Required() public readonly password: string;
    @Required() public readonly code: string;
}

class AdminLoginBody {
    @Required() public readonly email: string;
    @Required() public readonly password: string;
}
const isSecure = process.env.NODE_ENV === "production";
@Controller("/auth")
export class AuthenticationController {
    @Inject()
    private userService: UserService;
    @Inject()
    private profileService: ProfileService;
    @Inject()
    private verificationService: VerificationService;
    @Inject()
    private sessionService: SessionService;
    @Inject()
    private adminService: AdminService;

    @Post("/register-user")
    @(Returns(200, SuccessResult).Of(UserTokenReturnModel))
    public async registerUser(@Request() req: ExpressRequest, @BodyParams() body: RegisterUserParams) {
        const { email, username, password, verificationToken, referralCode } = body;
        if (!email || !password || !username || !verificationToken) throw new BadRequest(MISSING_PARAMS);
        if (await this.userService.findUserByEmail(email)) throw new Forbidden(EMAIL_EXISTS);
        if (await this.profileService.findProfileByUsername(username)) throw new Forbidden(USERNAME_EXISTS);
        await this.verificationService.verifyToken({ verificationToken, email });
        const userId = await this.userService.initNewUser(email, username, password, referralCode);
        const user = await this.userService.findUserByContext({ userId } as JWTPayload, { wallet: true });
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const token = await this.sessionService.initSession(user, {
            ip: req?.socket?.remoteAddress,
            userAgent: req?.headers["user-agent"],
        });
        return new SuccessResult({ token }, UserTokenReturnModel);
    }

    @Post("/user-login")
    @(Returns(200, SuccessResult).Of(UserTokenReturnModel))
    public async loginUser(@Request() req: ExpressRequest, @BodyParams() body: LoginParams) {
        const { email, password } = body;
        if (!email || !password) throw new BadRequest(MISSING_PARAMS);
        const user = await this.userService.findUserByEmail(email);
        if (!user) throw new NotFound(EMAIL_NOT_EXISTS);
        if (!user.active) throw new Forbidden(ACCOUNT_RESTRICTED);
        if (user.password !== createPasswordHash({ email, password })) throw new Forbidden(INCORRECT_PASSWORD);
        await this.userService.transferCoiinReward({ user, type: UserRewardType.LOGIN_REWARD });
        const token = await this.sessionService.initSession(user, {
            ip: req?.socket?.remoteAddress || "",
            userAgent: req?.headers["user-agent"] || "",
        });
        return new SuccessResult({ token }, UserTokenReturnModel);
    }

    @Post("/reset-user-password")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async resetUserPassword(@BodyParams() body: ResetUserPasswordParams) {
        const { verificationToken, password } = body;
        if (!verificationToken || !password) throw new BadRequest(MISSING_PARAMS);
        const verificationData = await this.verificationService.verifyToken({ verificationToken });
        const user = await this.userService.findUserByEmail(verificationData.email);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        await this.userService.resetUserPassword(user.id, user.email, password);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Post("/recover-user-account-step1")
    @(Returns(200, SuccessResult).Of(RecoverUserAccountResultModel))
    public async recoverUserAccountStep1(@BodyParams() body: RecoverUserAccountStep1Parms) {
        const { username, code } = body;
        if (!username || !code) throw new BadRequest(MISSING_PARAMS);
        const profile = await this.profileService.findProfileByUsername(username, {
            user: true,
        });
        if (!profile) throw new NotFound(USERNAME_NOT_EXISTS);
        if (!(await this.profileService.isRecoveryCodeValid(username, code))) throw new Forbidden(INCORRECT_CODE);
        if (!profile.user) throw new NotFound(USER_NOT_FOUND);
        if (!profile.user.email) return new SuccessResult({ userId: profile.user.id }, UserIdResultModel);
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
        const { email, type, admin } = body;

        if (!email || !type) throw new BadRequest(MISSING_PARAMS);
        if (!admin) {
            const userWithEmail = await this.userService.updatedUserEmail(email);
            if (type === "EMAIL" && userWithEmail) throw new BadRequest(EMAIL_EXISTS);
            if (type === "PASSWORD" && !userWithEmail) throw new BadRequest(EMAIL_NOT_EXISTS);
            if (type === "WITHDRAW" && !userWithEmail) throw new BadRequest(EMAIL_NOT_EXISTS);
        } else {
            let adminFound = false;
            try {
                await Firebase.getUserByEmail(email);
                adminFound = true;
            } catch (error) {}
            if (type === "EMAIL" && adminFound) throw new BadRequest(EMAIL_EXISTS);
        }
        const verificationData = await this.verificationService.generateVerification({ email, type });
        await SesClient.emailAddressVerificationEmail(
            email,
            this.verificationService.getDecryptedCode(verificationData.code)!
        );
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Post("/complete-verification")
    @(Returns(200, SuccessResult).Of(CompleteVerificationResultModel))
    public async completeVerification(@BodyParams() body: CompleteVerificationParams) {
        const { email, code } = body;
        if (!email || !code) throw new BadRequest(MISSING_PARAMS);
        const verification = await this.verificationService.verifyCode(email, code);
        return new SuccessResult(
            { success: true, verificationToken: this.verificationService.generateToken(verification.id) },
            CompleteVerificationResultModel
        );
    }

    @Get("/username-exists")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async usernameExists(@QueryParams() query: UsernameExistsParams) {
        const { username } = query;
        const profile = await this.profileService.isUsernameExists(username);
        return new SuccessResult({ success: !!profile }, BooleanResultModel);
    }

    @Put("/update-admin-password")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async updateAdminPassword(@BodyParams() body: UpdateAdminPasswordParams) {
        const { idToken, password } = body;
        const decodedToken = await Firebase.verifyToken(idToken);
        if (!decodedToken) return new Unauthorized(INVALID_TOKEN);
        const user = await Firebase.getUserById(decodedToken.uid);
        if (!user.customClaims) return new Unauthorized("Unauthorized!");
        await Firebase.updateUserPassword(user.uid, password);
        await Firebase.setCustomUserClaims(user.uid, user.customClaims.company, user.customClaims.role, false);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    // For admin-panel
    @Put("/reset-password")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async forgetAdminPassword(@BodyParams() body: ForgetAdminPasswordParams) {
        const { email, password, code } = body;
        await this.verificationService.verifyCode(email, code);
        const user = await Firebase.getUserByEmail(email);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        await Firebase.updateUserPassword(user.uid, password);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    //For admin-panel
    @Post("/start-admin-verification")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async startAdminVerification(@BodyParams() body: StartVerificationParams) {
        const { email, type } = body;
        if (!email || !type) throw new BadRequest(MISSING_PARAMS);
        const verificationData = await this.verificationService.generateVerification({ email, type });
        await SesClient.emailAddressVerificationEmail(
            email,
            this.verificationService.getDecryptedCode(verificationData.code)!
        );
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Post("/admin-login")
    @(Returns(200, SuccessResult).Of(AdminResultModel))
    public async adminLogin(@BodyParams() body: AdminLoginBody, @Response() res: Response) {
        const { email, password } = body;
        let sessionCookie;
        const authToken = await Firebase.loginUser(email, password);
        const decodedToken = await Firebase.verifyToken(authToken.idToken);
        const user = await Firebase.getUserById(decodedToken.uid);
        if (!user.customClaims) throw new Unauthorized(ADMIN_NOT_FOUND);
        if (user.customClaims.tempPass === true)
            return new SuccessResult(
                { resetPass: true, email: "", company: "", role: "", twoFactorEnabled: false },
                AdminResultModel
            );
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        if (new Date().getTime() / 1000 - decodedToken.auth_time < 5 * 60) {
            sessionCookie = await Firebase.createSessionCookie(authToken.idToken, expiresIn);
        } else {
            throw new Unauthorized("Recent Signin required.");
        }
        const admin = await this.adminService.findAdminByFirebaseId(decodedToken.uid);
        const options = { maxAge: expiresIn, httpOnly: true, secure: isSecure };
        res.cookie("session", sessionCookie, options);
        return new SuccessResult(
            {
                resetPass: false,
                email: user.email,
                company: user.customClaims.company,
                role: user.customClaims.role,
                twoFactorEnabled: admin?.twoFactorEnabled,
            },
            AdminResultModel
        );
    }

    // @Get("/binance")
    // @(Returns(200, SuccessResult).Of(Object))
    // public async getAll() {
    //     const timestamp = Date.now();
    //     const query_string = "timestamp=1578963600000";
    //     const apiSecret = "NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j";
    //     function signature(query_string: string) {
    //         return crypto.createHmac("sha256", apiSecret).update(query_string).digest("hex");
    //     }
    //     console.log(signature(query_string));
    //     const requestData: RequestData = {
    //         method: "GET",
    //         headers: { "X-MBX-APIKEY": "fY93QHW3r9pNNInGaPbvrf4eBWigjwZRrGyS96pDK5aCDmqATQ4eaiZN0sXnwoLm" },
    //         url: `https://api.binance.com/sapi/v1/capital/config/getall?timestamp=${timestamp}&signature=${signature}`,
    //     };
    //     const list = await doFetch(requestData);
    //     console.log("list--------------------------------------", list);
    // }
}
