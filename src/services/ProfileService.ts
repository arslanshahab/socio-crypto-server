import { Injectable } from "@tsed/di";
import { Prisma, User } from "@prisma/client";
import { sha256Hash } from "../util/crypto";
import { UpdateProfileInterestsParams, RemoveInterestsParams } from "../models/RestModels";
import { NotFound } from "@tsed/exceptions";
import { PROFILE_NOT_FOUND } from "../util/errors";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class ProfileService {
    public async findProfileByUsername<T extends Prisma.ProfileInclude | undefined>(username: string, include?: T) {
        return readPrisma.profile.findFirst({
            where: { username: username.toLowerCase() },
            include: include as T,
        });
    }

    public async createProfile(user: User, username: string) {
        return await prisma.profile.create({
            data: {
                userId: user.id,
                username: username.trim().toLowerCase(),
            },
        });
    }

    public async isRecoveryCodeValid(username: string, code: string) {
        const profile = await this.findProfileByUsername(username);
        return profile?.recoveryCode === sha256Hash(code);
    }

    public async findProfileByEmail(email: string) {
        return readPrisma.profile.findFirst({ where: { email: email.toLowerCase() } });
    }

    public async isUsernameExists(username: string) {
        return readPrisma.profile.findFirst({ where: { username } });
    }

    public async findProfileByUserId(userId: string) {
        return readPrisma.profile.findFirst({ where: { userId } });
    }

    public async updateProfile(userId: string, data: UpdateProfileInterestsParams) {
        return await prisma.profile.update({
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
        return await prisma.profile.update({
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
        return await prisma.profile.update({
            where: { userId },
            data: { username: username.trim().toLowerCase() },
        });
    }

    public async setRecoveryCode(profileId: string, code: number) {
        return await prisma.profile.update({
            where: { id: profileId },
            data: { recoveryCode: sha256Hash(code.toString()) },
        });
    }

    public async updateDeviceToken(userId: string, deviceToken: string) {
        return await prisma.profile.update({
            where: { userId },
            data: { deviceToken },
        });
    }

    public async updateProfilePicture(userId: string, picture: string) {
        return await prisma.profile.update({
            where: { userId },
            data: { profilePicture: picture },
        });
    }

    public async ifUsernameExist(username: string) {
        return Boolean(await readPrisma.profile.findFirst({ where: { username: username.toLowerCase() } }));
    }

    public async ifEmailExist(email: string) {
        return Boolean(await readPrisma.profile.findFirst({ where: { email: email.toLowerCase() } }));
    }
}
