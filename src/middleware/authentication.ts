import { Firebase } from "../clients/firebase";
import { AuthenticationError } from "apollo-server-express";
import express from "express";

export const authenticate = async ({ req }: { req: express.Request }) => {
    try {
        const isAdminUrl = req.baseUrl.includes("admin");
        const token = isAdminUrl ? req.cookies.session || "" : req.headers.authorization || "";
        if (!token) throw new AuthenticationError("No token provided or session not initialized");
        if (process.env.NODE_ENV === "development" && token === "Bearer raiinmaker") {
            return { user: { id: "banana", company: "raiinmaker", role: "admin" } };
        }
        const decodedToken = isAdminUrl ? await Firebase.verifySessionCookie(token) : await Firebase.verifyToken(token);
        if (!decodedToken) throw new AuthenticationError("invalid token");
        const firebaseUser = await Firebase.getUserById(decodedToken.uid);
        const user = {
            id: decodedToken.uid,
            email: decodedToken.email,
            method: "firebase",
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

export const checkPermissions = (opts: { hasRole?: string[]; restrictCompany?: string }, context: { user: any }) => {
    const { role, id, company } = context.user;
    console.log(`UID: ${id} requesting a admin route`);
    if (opts.hasRole) {
        if (!role || !opts.hasRole.includes(role)) throw new Error("forbidden");
    }
    if (opts.restrictCompany) {
        if (company !== opts.restrictCompany) throw new Error("forbidden");
    }
    if (role === "manager" && !company) throw new Error("forbidden, company not specified");
    return { role, company };
};
