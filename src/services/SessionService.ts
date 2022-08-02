import { Injectable } from "@tsed/di";
import { prisma } from "../clients/prisma";
import { User, Prisma } from "@prisma/client";
import { JWTPayload } from "src/types";
import { Secrets } from "../util/secrets";
import { serverBaseUrl } from "../config";
import jwt from "jsonwebtoken";
import { addDays } from "date-fns";
import { SESSION_EXPIRED, ACCOUNT_RESTRICTED, ACCOUNT_NOT_EXISTS_ANYMORE } from "../util/errors";
import { Forbidden } from "@tsed/exceptions";

@Injectable()
export class SessionService {
    private verifyToken(token: string) {
        return jwt.verify(token, Secrets.encryptionKey, { audience: serverBaseUrl }) as JWTPayload;
    }

    public async findSessionByUserId(userId: string) {
        return await prisma.session.findFirst({
            where: {
                userId: userId,
                logout: false,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    public async findSessionByToken<T extends Prisma.SessionInclude | undefined>(token: string, include?: T) {
        return prisma.session.findFirst({
            where: {
                token,
            },
            include: include as T,
            orderBy: { createdAt: "desc" },
        });
    }

    public async updateLastLogin(id: string) {
        return await prisma.session.update({
            where: {
                id,
            },
            data: {
                lastLogin: new Date(),
            },
        });
    }

    public async initSession(user: User, deviceData?: { ip?: string; device?: string }) {
        const payload: JWTPayload = {
            email: user.email,
            id: user.identityId!,
            userId: user.id,
            role: "admin",
        };
        const token = jwt.sign(payload, Secrets.encryptionKey, { expiresIn: "60s", audience: serverBaseUrl });
        const currentDate = new Date();
        await prisma.session.create({
            data: {
                token,
                expiry: addDays(currentDate, 7),
                userId: user.id,
                lastLogin: currentDate,
                ip: deviceData?.ip,
                deviceInfo: deviceData?.device,
            },
        });
        return token;
    }

    public async verifySession(token: string) {
        let jwtData;
        try {
            jwtData = this.verifyToken(token);
        } catch (error) {
            const prevSession = await this.findSessionByToken(token, { user: true });
            if (!prevSession) throw new Forbidden(SESSION_EXPIRED);
            await this.logoutUser(prevSession?.user!);
            throw new Forbidden(SESSION_EXPIRED);
        }
        const session = await this.findSessionByToken(token, { user: true });
        if (!session) throw new Forbidden(SESSION_EXPIRED);
        if (session?.user?.deletedAt) throw new Forbidden(ACCOUNT_NOT_EXISTS_ANYMORE);
        if (!session?.user?.active) throw new Forbidden(ACCOUNT_RESTRICTED);
        return jwtData;
    }

    public async logoutUser(user: User) {
        const currentDate = new Date();
        const session = await this.findSessionByUserId(user.id);
        return await prisma.session.update({
            where: { id: session?.id },
            data: {
                logout: true,
                logoutAt: currentDate,
            },
        });
    }

    public async ifSessionExist(user: User) {
        const session = await this.findSessionByUserId(user.id);
        if (!session) return false;
        try {
            if (this.verifyToken(session.token)) return true;
        } catch (error) {
            return false;
        }
        return true;
    }
}
