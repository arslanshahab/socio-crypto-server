import { Injectable } from "@tsed/di";
import { prisma } from "../clients/prisma";
import { User, Prisma, Session } from "@prisma/client";
import { isPast, addDays } from "date-fns";
import { SESSION_EXPIRED, ACCOUNT_RESTRICTED, ACCOUNT_NOT_EXISTS_ANYMORE } from "../util/errors";
import { Forbidden } from "@tsed/exceptions";
import crypto from "crypto";
import { Secrets } from "../util/secrets";
import { generateRandomId } from "../util";

@Injectable()
export class SessionService {
    private createToken(email: string) {
        return crypto
            .createHash("sha512")
            .update(`${email}:${generateRandomId()}:${Secrets.encryptionKey}`)
            .digest("base64");
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
                logout: false,
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
        const token = this.createToken(user.email);
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
        const session = await this.findSessionByToken(token, { user: true });
        if (!session) throw new Forbidden(SESSION_EXPIRED);
        if (this.isExpired(session)) {
            await this.logoutUser(session?.user!);
            throw new Forbidden(SESSION_EXPIRED);
        }
        if (session?.user?.deletedAt) throw new Forbidden(ACCOUNT_NOT_EXISTS_ANYMORE);
        if (!session?.user?.active) throw new Forbidden(ACCOUNT_RESTRICTED);
        await this.updateLastLogin(session.id);
        return { userId: session.userId };
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
        if (this.isExpired(session)) return false;
        return true;
    }

    public isExpired(session: Session) {
        return isPast(session.expiry);
    }
}
