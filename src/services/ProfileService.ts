import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { User } from "@prisma/client";
import { sha256Hash } from "../util/crypto";
import { UpdateProfileInterestsParams } from "../models/RestModels";

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

    public async findProfileByEmail(email: string) {
        return this.prismaService.profile.findFirst({
            where: { email: { contains: email, mode: "insensitive" } },
            include: { user: true },
        });
    }

    public async isUsernameExists(username: string) {
        return this.prismaService.profile.findFirst({ where: { username } });
    }

    public async findProfileByUserId(userId: string) {
        return this.prismaService.profile.findFirst({ where: { userId } });
    }

    public async updateProfile(userId: string, data: UpdateProfileInterestsParams) {
        return await this.prismaService.profile.update({
            where: { userId },
            data: {
                ageRange: data.ageRange ? data.ageRange : null,
                city: data.city ? data.city : null,
                state: data.state ? data.state : null,
                country: data.country ? data.country : null,
                interests: data.interests ? JSON.stringify(data.interests) : "",
                values: data.values ? JSON.stringify(data.values) : "",
            },
        });
    }
}
