import { Firebase } from "../clients/firebase";
import { AuthenticationError } from "apollo-server-express";
import express from "express";
import { verifySessionToken } from "../util";
import { FormattedError, NO_TOKEN_PROVIDED } from "../util/errors";

export const authenticateAdmin = async ({ req }: { req: express.Request }) => {
    try {
        const token = req.cookies.session || "";
        if (!token) throw new AuthenticationError("No token provided or session not initialized");
        const decodedToken = await Firebase.verifySessionCookie(token);
        if (!decodedToken) throw new AuthenticationError("invalid token");
        const firebaseUser = await Firebase.getUserById(decodedToken.uid);
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
        console.log(token);
        if (!token) throw new Error(NO_TOKEN_PROVIDED);
        const user = verifySessionToken(token);
        return { user };
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
