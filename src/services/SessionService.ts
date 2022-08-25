import { Injectable } from "@tsed/di";
import { prisma } from "../clients/prisma";
import { User, Prisma, Session } from "@prisma/client";
import { isPast, addDays } from "date-fns";
import { SESSION_EXPIRED, ACCOUNT_RESTRICTED, ACCOUNT_NOT_EXISTS_ANYMORE } from "../util/errors";
import { Forbidden } from "@tsed/exceptions";
import { decrypt, encrypt } from "../util/crypto";
@Injectable()
export class SessionService {
    public async findSessionByUserId(userId: string) {
        return await prisma.session.findFirst({
            where: {
                userId: userId,
                logout: false,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    public async findSessionById<T extends Prisma.SessionInclude | undefined>(id: string, include?: T) {
        return prisma.session.findFirst({
            where: {
                id,
                logout: false,
            },
            include: include as T,
            orderBy: { createdAt: "desc" },
        });
    }

    public async findSessionByToken<T extends Prisma.SessionInclude | undefined>(token: string, include?: T) {
        return prisma.session.findFirst({
            where: {
                token,
                logout: false,
            },
            include: include as T,
            orderBy: { createdAt: "desc" },
        });
    }

    public async updateLastLogin(session: Session) {
        return await prisma.session.update({
            where: {
                id: session.id,
            },
            data: {
                lastLogin: new Date(),
                expiry: addDays(session.expiry, 1),
            },
        });
    }

    public async initSession(user: User, deviceData?: { ip?: string; userAgent?: string }) {
        if (await this.ifSessionExist(user)) await this.logoutUser(user);
        const currentDate = new Date();
        const session = await prisma.session.create({
            data: {
                token: "",
                expiry: addDays(currentDate, 7),
                userId: user.id,
                lastLogin: currentDate,
                ip: deviceData?.ip,
                deviceInfo: deviceData?.userAgent,
            },
        });
        return encrypt(session.id);
    }

    public async verifySession(token: string) {
        const sessionId = decrypt(token);
        if (!sessionId) throw new Forbidden(SESSION_EXPIRED);
        const session = await this.findSessionById(sessionId, { user: true });
        if (!session) throw new Forbidden(SESSION_EXPIRED);
        if (this.isExpired(session)) {
            await this.logoutUser(session?.user!);
            throw new Forbidden(SESSION_EXPIRED);
        }
        if (session?.user?.deletedAt) throw new Forbidden(ACCOUNT_NOT_EXISTS_ANYMORE);
        if (!session?.user?.active) throw new Forbidden(ACCOUNT_RESTRICTED);
        await this.updateLastLogin(session);
        return { userId: session.userId };
    }

    public async logoutUser(user: User) {
        const currentDate = new Date();
        return await prisma.session.updateMany({
            where: { userId: user.id, logout: false },
            data: {
                logout: true,
                logoutAt: currentDate,
            },
        });
    }

    public async ifSessionExist(user: User) {
        const session = await this.findSessionByUserId(user.id);
        if (!session) return false;
        if (this.isExpired(session)) return false;
        return true;
    }

    public isExpired(session: Session) {
        return isPast(session.expiry);
    }
}
