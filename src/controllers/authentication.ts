import { Firebase } from "../clients/firebase";
import { asyncHandler, generateRandomNonce } from "../util/helpers";
import { Request, Response } from "express";
import { Profile } from "../models/Profile";
import { Like } from "typeorm";
import { ApolloError } from "apollo-server-express";
import { Verification } from "../models/Verification";
import { SesClient } from "../clients/ses";
import { User } from "../models/User";
import { VerificationType } from "src/types";

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

export const registerUser = async (parent: any, args: { email: string; username: string; password: string }) => {
    try {
        const { email, password, username } = args;
        if (!email || !password || !username) throw new Error("Missing parameters");
        if (await Profile.findOne({ where: { email: Like(email) } })) throw new Error("email already exists");
        const verification = await Verification.findOne({ where: { email, verified: true } });
        if (!verification) throw new Error("email not verified");
        const firebaseUser = await Firebase.createNewUser(email, password);
        const user = await User.initNewUser();
        user.firebaseId = firebaseUser.uid;
        user.profile.email = email;
        user.profile.username = username;
        await user.save();
        await user.profile.save();
        const loggedInUser = await Firebase.loginUser(email, password);
        return { token: loggedInUser.idToken };
    } catch (error) {
        throw new ApolloError(error.message);
    }
};

export const loginUser = async (parent: any, args: { email: string; password: string }) => {
    try {
        const { email, password } = args;
        if (!email || !password) throw new Error("Missing parameters");
        if (!(await Profile.findOne({ where: { email: Like(email) } }))) throw new Error("email is not valid");
        const loggedInUser = await Firebase.loginUser(email, password);
        return { token: loggedInUser.idToken };
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

export const changeUserPassword = async (
    parent: any,
    args: { email: string; password: string },
    context: { user: any }
) => {
    try {
        const { password } = args;
        if (!password) throw new ApolloError("password is required");
        if (!(await User.findOne({ where: { firebaseId: context.user.id } }))) throw new ApolloError("user not found");
        await Firebase.updateUserPassword(context.user.id, password);
        return { success: true };
    } catch (error) {
        throw new ApolloError(error.message);
    }
};

export const startVerification = async (parent: any, args: { email: string; type: VerificationType }) => {
    try {
        const { email, type } = args;
        if (!email || !type) throw new Error("missing parameters");
        if (type === "EMAIL" && (await Profile.findOne({ where: { email: Like(email) } })))
            throw new Error("email already exists");
        let verificationData = await Verification.findOne({ where: { email, type, verified: false } });
        if (!verificationData) {
            verificationData = await Verification.createVerification(email, generateRandomNonce(), type);
        }
        await SesClient.emailAddressVerificationEmail(email, verificationData.token);
        return { success: true };
    } catch (error) {
        throw new ApolloError(error.message);
    }
};

export const completeVerification = async (
    parent: any,
    args: { email: string; token: string; type: VerificationType; password?: string }
) => {
    try {
        const { email, token, password, type } = args;
        if (!email || !token) throw new Error("email or token missing");
        const verificationData = await Verification.findOne({ where: { email, token, type, verified: false } });
        if (!verificationData) throw new Error("invalid token or verfication not initialized");
        await verificationData.updateVerificationStatus(true);
        if (type === "PASSWORD" && password) {
            const userData = await Firebase.getUserByEmail(email);
            await Firebase.updateUserPassword(userData.uid, password);
        }
        return { success: true };
    } catch (error) {
        throw new ApolloError(error.message);
    }
};
