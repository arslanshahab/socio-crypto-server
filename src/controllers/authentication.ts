import { Firebase } from "../clients/firebase";
import { asyncHandler, generateRandomNonce } from "../util/helpers";
import { Request, Response } from "express";
import { Like } from "typeorm";
import { ApolloError, AuthenticationError } from "apollo-server-express";
import { Verification } from "../models/Verification";
import { SesClient } from "../clients/ses";
import { User } from "../models/User";
import { VerificationType } from "src/types";
import { createSessionToken, createPasswordHash } from "../helpers";
import { encrypt, decrypt, sha256Hash } from "../util/crypto";
import { Profile } from "../models/Profile";

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
        if (!email || !password || !username || !verificationToken) throw new Error("Missing parameters");
        if (await User.findOne({ where: { email: Like(email) } })) throw new Error("email already exists");
        const verificationData = await Verification.findOne({ where: { id: decrypt(verificationToken) } });
        if (!verificationData || !verificationData.verified) throw new Error("email not verified");
        const user = await User.initNewUser(email, createPasswordHash(email, password), username);
        return { token: createSessionToken({ email: user.email, userId: user.id }) };
    } catch (error) {
        console.log(error);
        throw new ApolloError(error.message);
    }
};

export const loginUser = async (parent: any, args: { email: string; password: string }) => {
    try {
        const { email, password } = args;
        if (!email || !password) throw new Error("Missing parameters.");
        const user = await User.findOne({ where: { email: Like(email) } });
        if (!user) throw new ApolloError("email doesn't exist.");
        if (user.password !== createPasswordHash(email, password)) throw new ApolloError("wrong password.");
        return { token: createSessionToken({ email: user.email, userId: user.id }) };
    } catch (error) {
        throw new ApolloError(error.message);
    }
};

export const logoutUser = async (parent: any, args: any, context: { user: any }) => {
    try {
        return await Firebase.revokeRefreshToken(context.user.sub);
    } catch (error) {
        throw new ApolloError(error.message);
    }
};

export const resetUserPassword = async (parent: any, args: { verificationToken: string; password: string }) => {
    try {
        const { password, verificationToken } = args;
        if (!verificationToken || !password) throw new ApolloError("Missing parameters");
        const verificationData = await Verification.findOne({ where: { id: decrypt(verificationToken) } });
        if (!verificationData || !verificationData.verified) throw new Error("email not verified");
        const user = await User.findOne({ where: { email: verificationData.email } });
        if (!user) throw new ApolloError("User not found.");
        user.password = createPasswordHash(verificationData.email, password);
        await user.save();
        return { success: true };
    } catch (error) {
        throw new ApolloError(error.message);
    }
};

export const recoverUserAccountStep1 = async (parent: any, args: { username: string; code: string }) => {
    try {
        const { username, code } = args;
        const profile = await Profile.findOne({
            where: { username, recoveryCode: sha256Hash(code) },
        });
        if (!profile) throw new AuthenticationError("invalid username or code");
        const user = await User.findOne({ where: { id: profile.user } });
        if (!user) throw new ApolloError("User not found");
        if (!user.email) {
            return { userId: user.id };
        } else {
            return { token: createSessionToken({ email: user.email, userId: user.id }) };
        }
    } catch (error) {
        throw new ApolloError(error.message);
    }
};

export const recoverUserAccountStep2 = async (
    parent: any,
    args: { email: string; password: string; userId: string; verificationToken: string }
) => {
    try {
        const { email, password, userId, verificationToken } = args;
        const user = await User.findOne({ where: { id: userId } });
        if (!user) throw new ApolloError("invalid userId.");
        const verificationData = await Verification.findOne({ where: { id: decrypt(verificationToken) } });
        if (!verificationData || !verificationData.verified) throw new Error("email not verified");
        if (user.email) throw new ApolloError("User has already registered.");
        user.email = email;
        user.password = createPasswordHash(email, password);
        await user.save();
        return { token: createSessionToken({ email, userId }) };
    } catch (error) {
        throw new ApolloError(error.message);
    }
};

export const startVerification = async (parent: any, args: { email: string; type: VerificationType }) => {
    try {
        const { email, type } = args;
        if (!email || !type) throw new Error("missing parameters");
        const userWithEmail = await User.findOne({ where: { email: Like(email) } });
        if (type === "EMAIL" && userWithEmail) throw new Error("email already exists");
        if (type === "PASSWORD" && !userWithEmail) throw new Error("email doesn't exist");
        let verificationData = await Verification.findOne({ where: { email, verified: false } });
        if (!verificationData) {
            verificationData = await Verification.createVerification(email, generateRandomNonce());
        }
        await SesClient.emailAddressVerificationEmail(email, verificationData.code);
        return { success: true };
    } catch (error) {
        throw new ApolloError(error.message);
    }
};

export const completeVerification = async (parent: any, args: { email: string; code: string }) => {
    try {
        const { email, code } = args;
        if (!email || !code) throw new Error("email or code missing");
        const verificationData = await Verification.findOne({ where: { email, code, verified: false } });
        if (!verificationData) throw new Error("invalid code or verfication not initialized");
        await verificationData.updateVerificationStatus(true);
        return { success: true, verificationToken: encrypt(verificationData.id) };
    } catch (error) {
        throw new ApolloError(error.message);
    }
};
