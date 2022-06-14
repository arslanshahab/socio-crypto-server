import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { User } from "@prisma/client";
import { sha256Hash } from "../util/crypto";

@Injectable()
export class ProfileService {
    @Inject()
    private prismaService: PrismaService;

    public async findProfileByUsername(username: string) {
        return this.prismaService.profile.findFirst({
            where: { username: { contains: username, mode: "insensitive" } },
            include: { user: true },
        });
    }

    public async createProfile(user: User, username: string) {
        return await this.prismaService.profile.create({
            data: {
                userId: user.id,
                email: user.email,
                username: username,
            },
        });
    }

    public async isRecoveryCodeValid(username: string, code: string) {
        const profile = await this.findProfileByUsername(username);
        return profile?.recoveryCode === sha256Hash(code);
    }
}
