import { Injectable } from "@tsed/di";
import { prisma } from "../clients/prisma";

@Injectable()
export class AdminService {
    public async findSessionByUserId(userId: string) {
        return await prisma.session.findFirst({
            where: {
                userId: userId,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    public async findSessionByToken(token: string) {
        return await prisma.session.findFirst({
            where: {
                token,
            },
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
}
