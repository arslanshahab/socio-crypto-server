import { Firebase } from "../clients/firebase";
import { Request, Response } from "express";
import { ILike } from "typeorm";
import { Verification } from "../models/Verification";
import { SesClient } from "../clients/ses";
import { User } from "../models/User";
import { JWTPayload, VerificationType } from "src/types";
import { createSessionToken, createPasswordHash, asyncHandler } from "../util";
import { Profile } from "../models/Profile";
import {
    FormattedError,
    MISSING_PARAMS,
    USERNAME_EXISTS,
    EMAIL_EXISTS,
    INCORRECT_PASSWORD,
    EMAIL_NOT_EXISTS,
    USERNAME_NOT_EXISTS,
    INCORRECT_CODE,
    USER_NOT_FOUND,
} from "../util/errors";

const isSecure = process.env.NODE_ENV === "production";

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { idToken } = req.body;
        let sessionCookie;
        const decodedToken = await Firebase.verifyToken(idToken);
        const user = await Firebase.getUserById(decodedToken.uid);
        if (!user.customClaims) return res.status(401).json({ code: "UNAUTHORIZED", message: "unauthorized" });
        if (user.customClaims.tempPass === true) return res.status(200).json({ resetPass: true });
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        // Only process if the user just signed in in the last 5 minutes.
        if (new Date().getTime() / 1000 - decodedToken.auth_time < 5 * 60) {
            sessionCookie = await Firebase.createSessionCookie(idToken, expiresIn);
        } else {
            res.status(401).send("Recent sign in required!");
        }
        const options = { maxAge: expiresIn, httpOnly: true, secure: isSecure };
        res.cookie("session", sessionCookie, options);
        return res.status(200).json({ resetPass: false });
    } catch (error) {
        throw new Error("Something went wrong with your request. please try again!");
    }
});

export const adminLogout = asyncHandler(async (req: Request, res: Response) => {
    try {
        const sessionCookie = req.cookies.session || "";
        res.clearCookie("session");
        const decodedToken = await Firebase.verifySessionCookie(sessionCookie);
        await Firebase.revokeRefreshToken(decodedToken.sub);
        return res.status(200).json({ success: true });
    } catch (error) {
        throw new Error("Something went wrong with your request. please try again!");
    }
});

export const getUserRole = async (parent: any, args: any, context: { user: any }) => {
    try {
        return {
            role: context.user.role ? context.user.role : null,
            company: context.user.company ? context.user.company : null,
            tempPass: context.user.tempPass ? context.user.tempPass : null,
        };
    } catch (error) {
        throw new Error("Something went wrong.");
    }
};

export const updateUserPassword = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { idToken, password } = req.body;
        const decodedToken = await Firebase.verifyToken(idToken);
        if (!decodedToken) return res.status(401).json({ code: "UNAUTHORIZED", message: "unauthorized" });
        const user = await Firebase.getUserById(decodedToken.uid);
        if (!user.customClaims) return res.status(401).json({ code: "UNAUTHORIZED", message: "unauthorized" });
        await Firebase.updateUserPassword(user.uid, password);
        await Firebase.setCustomUserClaims(user.uid, user.customClaims.company, user.customClaims.role, false);
        return res.status(200).json({ success: true });
    } catch (error) {
        throw new Error("Something went wrong.");
    }
});

export const registerUser = async (
    parent: any,
    args: { email: string; username: string; password: string; verificationToken: string }
) => {
    try {
        const { email, password, username, verificationToken } = args;
        if (!email || !password || !username || verificationToken) throw new Error(MISSING_PARAMS);
        if (await User.findOne({ where: { email: ILike(email) } })) throw new Error(EMAIL_EXISTS);
        if (await Profile.findOne({ where: { username: ILike(username) } })) throw new Error(USERNAME_EXISTS);
        await Verification.verifyToken({ verificationToken, email });
        const userId = await User.initNewUser(email, createPasswordHash({ email, password }), username);
        const user = await User.findUserByContext({ userId } as JWTPayload, ["wallet"]);
        if (!user) throw new Error(USER_NOT_FOUND);
        await user.transferCoiinReward({ type: "REGISTRATION_REWARD" });
        return { token: createSessionToken(user) };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const loginUser = async (parent: any, args: { email: string; password: string }) => {
    try {
        const { email, password } = args;
        if (!email || !password) throw new Error(MISSING_PARAMS);
        const user = await User.findOne({ where: { email: ILike(email) }, relations: ["wallet"] });
        if (!user) throw new Error(EMAIL_NOT_EXISTS);
        if (user.password !== createPasswordHash({ email, password })) throw new Error(INCORRECT_PASSWORD);
        await user.updateLastLogin();
        await user.transferCoiinReward({ type: "LOGIN_REWARD" });
        return { token: createSessionToken(user) };
    } catch (error) {
        return new FormattedError(error);
    }
};

export const resetUserPassword = async (parent: any, args: { verificationToken: string; password: string }) => {
    try {
        const { password, verificationToken } = args;
        if (!verificationToken || !password) throw new Error(MISSING_PARAMS);
        const verificationData = await Verification.verifyToken({ verificationToken });
        const user = await User.findOne({ where: { email: verificationData.email } });
        if (!user) throw new Error(USER_NOT_FOUND);
        user.password = createPasswordHash({ email: verificationData.email, password });
        await user.save();
        return { success: true };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const recoverUserAccountStep1 = async (parent: any, args: { username: string; code: string }) => {
    try {
        const { username, code } = args;
        if (!username || !code) throw new Error(MISSING_PARAMS);
        const profile = await Profile.findOne({ where: { username: ILike(username) }, relations: ["user"] });
        if (!profile) throw new Error(USERNAME_NOT_EXISTS);
        if (!profile.isRecoveryCodeValid(code)) throw new Error(INCORRECT_CODE);
        const user = profile.user;
        if (!user) throw new Error(USER_NOT_FOUND);
        if (!user.email) {
            return { userId: user.id };
        } else {
            return { token: createSessionToken(user) };
        }
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const recoverUserAccountStep2 = async (
    parent: any,
    args: { email: string; password: string; userId: string; verificationToken: string }
) => {
    try {
        const { email, password, userId, verificationToken } = args;
        const user = await User.findOne({ where: { id: userId } });
        if (!user) throw new Error(USER_NOT_FOUND);
        await Verification.verifyToken({ verificationToken, email });
        if (user.email) throw new Error(EMAIL_EXISTS);
        await user.updateEmailPassword(email, createPasswordHash({ email, password }));
        return { token: createSessionToken(user) };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const startVerification = async (parent: any, args: { email: string; type: VerificationType }) => {
    try {
        const { email, type } = args;
        if (!email || !type) throw new Error(MISSING_PARAMS);
        const userWithEmail = await User.findUserByEmail(email);
        if (type === "EMAIL" && userWithEmail) throw new Error(EMAIL_EXISTS);
        if (type === "PASSWORD" && !userWithEmail) throw new Error(EMAIL_NOT_EXISTS);
        if (type === "WITHDRAW" && !userWithEmail) throw new Error(EMAIL_NOT_EXISTS);
        let verificationData = await Verification.generateVerification({ email, type });
        await SesClient.emailAddressVerificationEmail(email, verificationData.getDecryptedCode());
        return { success: true };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const completeVerification = async (parent: any, args: { email: string; code: string }) => {
    try {
        const { email, code } = args;
        if (!email || !code) throw new Error(MISSING_PARAMS);
        const verification = await Verification.verifyCode({ code, email });
        return { success: true, verificationToken: verification.generateToken() };
    } catch (error) {
        throw new FormattedError(error);
    }
};
