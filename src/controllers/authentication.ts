import { Firebase } from "../clients/firebase";
import { asyncHandler, generateRandomNonce } from "../util/helpers";
import { Request, Response } from "express";
import { ILike } from "typeorm";
import { Verification } from "../models/Verification";
import { SesClient } from "../clients/ses";
import { User } from "../models/User";
import { VerificationType } from "src/types";
import { createSessionToken, createPasswordHash } from "../helpers";
import { encrypt, decrypt, sha256Hash } from "../util/crypto";
import { Profile } from "../models/Profile";
import { FormattedError } from "../util/errors";

const isSecure = process.env.NODE_ENV === "production";

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
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
});

export const adminLogout = asyncHandler(async (req: Request, res: Response) => {
    const sessionCookie = req.cookies.session || "";
    res.clearCookie("session");
    const decodedToken = await Firebase.verifySessionCookie(sessionCookie);
    await Firebase.revokeRefreshToken(decodedToken.sub);
    return res.status(200).json({ success: true });
});

export const getUserRole = async (parent: any, args: any, context: { user: any }) => {
    return {
        role: context.user.role ? context.user.role : null,
        company: context.user.company ? context.user.company : null,
        tempPass: context.user.tempPass ? context.user.tempPass : null,
    };
};

export const updateUserPassword = asyncHandler(async (req: Request, res: Response) => {
    const { idToken, password } = req.body;
    const decodedToken = await Firebase.verifyToken(idToken);
    if (!decodedToken) return res.status(401).json({ code: "UNAUTHORIZED", message: "unauthorized" });
    const user = await Firebase.getUserById(decodedToken.uid);
    if (!user.customClaims) return res.status(401).json({ code: "UNAUTHORIZED", message: "unauthorized" });
    await Firebase.updateUserPassword(user.uid, password);
    await Firebase.setCustomUserClaims(user.uid, user.customClaims.company, user.customClaims.role, false);
    return res.status(200).json({ success: true });
});

export const registerUser = async (
    parent: any,
    args: { email: string; username: string; password: string; verificationToken: string }
) => {
    try {
        const { email, password, username, verificationToken } = args;
        if (!email || !password || !username || !verificationToken) throw new Error("ERROR:1");
        if (await User.findOne({ where: { email: ILike(email) } })) throw new Error("ERROR:2");
        const verificationData = await Verification.findOne({ where: { id: decrypt(verificationToken) } });
        if (!verificationData || !verificationData.verified) throw new Error("ERROR:3");
        const user = await User.initNewUser(email, createPasswordHash(email, password), username);
        return { token: createSessionToken({ email: user.email, id: user.id }) };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const loginUser = async (parent: any, args: { email: string; password: string }) => {
    try {
        const { email, password } = args;
        if (!email || !password) throw new Error("ERROR:1");
        const user = await User.findOne({ where: { email: ILike(email) } });
        if (!user) throw new Error("ERROR:1");
        if (user.password !== createPasswordHash(email, password)) throw new Error("ERROR:5");
        return { token: createSessionToken({ email: user.email, id: user.id }) };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const resetUserPassword = async (parent: any, args: { verificationToken: string; password: string }) => {
    try {
        const { password, verificationToken } = args;
        if (!verificationToken || !password) throw new Error("ERROR:1");
        const verificationData = await Verification.findOne({ where: { id: decrypt(verificationToken) } });
        if (!verificationData || !verificationData.verified) throw new Error("ERROR:3");
        const user = await User.findOne({ where: { email: verificationData.email } });
        if (!user) throw new Error("ERROR:6");
        user.password = createPasswordHash(verificationData.email, password);
        await user.save();
        return { success: true };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const recoverUserAccountStep1 = async (parent: any, args: { username: string; code: string }) => {
    try {
        const { username, code } = args;
        if (!username || !code) throw new Error("ERROR:1");
        const profile = await Profile.findOne({ where: { username: ILike(username) }, relations: ["user"] });
        if (!profile) throw new Error("ERROR:7");
        if (profile.recoveryCode !== sha256Hash(code)) throw new Error("ERROR:8");
        const user = await User.findOne({ where: { id: profile.user } });
        if (!user) throw new Error("ERROR:6");
        if (!user.email) {
            return { userId: user.id };
        } else {
            return { token: createSessionToken({ email: user.email, id: user.id }) };
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
        if (!user) throw new Error("ERROR:6");
        const verificationData = await Verification.findOne({ where: { id: decrypt(verificationToken) } });
        if (!verificationData || !verificationData.verified) throw new Error("ERROR:3");
        if (user.email) throw new Error("ERROR:2");
        user.email = email;
        user.password = createPasswordHash(email, password);
        await user.save();
        return { token: createSessionToken({ email, id: userId }) };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const startVerification = async (parent: any, args: { email: string; type: VerificationType }) => {
    try {
        const { email, type } = args;
        if (!email || !type) throw new Error("ERROR:1");
        const userWithEmail = await User.findOne({ where: { email: ILike(email) } });
        if (type === "EMAIL" && userWithEmail) throw new Error("ERROR:2");
        if (type === "PASSWORD" && !userWithEmail) throw new Error("ERROR:4");
        let verificationData = await Verification.findOne({ where: { email, verified: false } });
        if (!verificationData) {
            verificationData = await Verification.createVerification(email, generateRandomNonce());
        }
        await SesClient.emailAddressVerificationEmail(email, verificationData.code);
        return { success: true };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const completeVerification = async (parent: any, args: { email: string; code: string }) => {
    try {
        const { email, code } = args;
        if (!email || !code) throw new Error("ERROR:!");
        const verificationData = await Verification.findOne({ where: { email, code, verified: false } });
        if (!verificationData) throw new Error("ERROR:8");
        await verificationData.updateVerificationStatus(true);
        return { success: true, verificationToken: encrypt(verificationData.id) };
    } catch (error) {
        throw new FormattedError(error);
    }
};
