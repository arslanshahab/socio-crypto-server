import { AuthenticationError } from "apollo-server-express";
import express from "express";
import { ACCOUNT_RESTRICTED, FormattedError, NO_TOKEN_PROVIDED } from "../util/errors";
import { User } from "../models/User";
import { SessionService } from "../services/SessionService";
import { JWTPayload } from "types.d.ts";
import { FirebaseAdmin } from "../clients/firebaseAdmin";

const sessionService = new SessionService();

export const authenticateAdmin = async ({ req }: { req: express.Request }) => {
    try {
        const token = req.cookies.session || "";
        if (!token) throw new AuthenticationError("No token provided or session not initialized");
        const decodedToken = await FirebaseAdmin.verifySessionCookie(token);
        if (!decodedToken) throw new AuthenticationError("invalid token");
        const firebaseUser = await FirebaseAdmin.getUserById(decodedToken.uid);
        const user = {
            id: decodedToken.uid,
            method: "firebase",
            ...decodedToken,
            ...(firebaseUser.customClaims && {
                role: firebaseUser.customClaims.role,
                company: firebaseUser.customClaims.company,
                tempPass: firebaseUser.customClaims.tempPass || false,
            }),
        };
        return { user };
    } catch (error) {
        throw new AuthenticationError("Unauthorized", error.message);
    }
};

export const authenticateUser = async ({ req }: { req: express.Request }) => {
    try {
        const token = req.headers.authorization || "";
        if (!token) throw new Error(NO_TOKEN_PROVIDED);
        const user = await sessionService.verifySession(token);
        const userData = await User.findUserByContext(user as JWTPayload);
        if (!userData?.active) throw new Error(ACCOUNT_RESTRICTED);
        return { user: { ...user, ip: req.socket.remoteAddress } };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const checkPermissions = (opts: { hasRole?: string[]; restrictCompany?: string }, context: { user: any }) => {
    const { role, company } = context.user;
    if (opts.hasRole) {
        if (!role || !opts.hasRole.includes(role)) throw new Error("forbidden");
    }
    if (opts.restrictCompany) {
        if (company !== opts.restrictCompany) throw new Error("forbidden");
    }
    if (role === "manager" && !company) throw new Error("forbidden, company not specified");
    return { role, company };
};
