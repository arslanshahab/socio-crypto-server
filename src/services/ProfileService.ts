import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { User } from "@prisma/client";
import { sha256Hash } from "../util/crypto";
import { UpdateProfileInterestsParams, RemoveInterestsParams } from "../models/RestModels";
import { NotFound } from "@tsed/exceptions";
import { PROFILE_NOT_FOUND } from "../util/errors";

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
                ageRange: data.ageRange && data.ageRange,
                city: data.city && data.city,
                state: data.state && data.state,
                country: data.country && data.country,
                interests: data.interests && JSON.stringify(data.interests),
                values: data.values && JSON.stringify(data.values),
            },
        });
    }

    public async removeProfileInterests(userId: string, data: RemoveInterestsParams) {
        const profile = await this.findProfileByUserId(userId);
        if (!profile) throw new NotFound(PROFILE_NOT_FOUND);
        const interests = JSON.parse(profile.interests);
        const values = JSON.parse(profile.values);
        if (data.interests) {
            const index = interests.indexOf(data.interests);
            if (index > -1) interests.splice(index, 1);
        }
        if (data.values) {
            const index = values.indexOf(data.values);
            if (index > -1) values.splice(index, 1);
        }
        return await this.prismaService.profile.update({
            where: { userId },
            data: {
                ageRange: data.ageRange && null,
                city: data.city && null,
                state: data.state && null,
                country: data.country && null,
                interests: data.interests && JSON.stringify(interests),
                values: data.values && JSON.stringify(values),
            },
        });
    }

    public async updateUsername(userId: string, username: string) {
        return await this.prismaService.profile.update({
            where: { userId },
            data: { username },
        });
    }

    public async setRecoveryCode(profileId: string, code: number) {
        return await this.prismaService.profile.update({
            where: { id: profileId },
            data: { recoveryCode: sha256Hash(code.toString()) },
        });
    }

    public async updateDeviceToken(userId: string, deviceToken: string) {
        return await this.prismaService.profile.update({
            where: { userId },
            data: { deviceToken },
        });
    }
}
