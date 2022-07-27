import { Injectable } from "@tsed/di";
import { User, SocialLink } from "@prisma/client";
import { encrypt, decrypt } from "../util/crypto";
import { SocialLinkType } from "../util/constants";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class SocialLinkService {
    public async findSocialLinkByUserAndType(userId: string, type: SocialLinkType | string) {
        const socialLink = await readPrisma.socialLink.findFirst({
            where: {
                userId,
                type,
            },
        });
        return {
            ...socialLink,
            ...(socialLink?.apiKey &&
                socialLink.apiSecret && {
                    apiKey: decrypt(socialLink?.apiKey),
                    apiSecret: decrypt(socialLink?.apiSecret),
                }),
        } as SocialLink;
    }

    public async addTwitterLink(user: User, apiKey: string, apiSecret: string) {
        const socialLink = await readPrisma.socialLink.findFirst({
            where: { userId: user.id, type: "twitter" },
        });
        if (socialLink) {
            return await prisma.socialLink.update({
                where: { id: socialLink.id },
                data: {
                    apiKey: encrypt(apiKey),
                    apiSecret: encrypt(apiSecret),
                },
            });
        } else {
            return await prisma.socialLink.create({
                data: {
                    userId: user.id,
                    type: "twitter",
                    apiKey: encrypt(apiKey),
                    apiSecret: encrypt(apiSecret),
                },
            });
        }
    }

    public async removeSocialLink(userId: string, type: SocialLinkType) {
        const socialLink = await this.findSocialLinkByUserAndType(userId, type);
        return await prisma.socialLink.delete({
            where: { id: socialLink?.id },
        });
    }

    public async addOrUpdateTiktokLink(
        userId: string,
        tokens: {
            open_id: string;
            access_token: string;
            expires_in: number;
            refresh_token: string;
            refresh_expires_in: number;
        }
    ) {
        let socialLink = await readPrisma.socialLink.findFirst({
            where: { userId, type: SocialLinkType.TIKTOK },
        });
        if (!socialLink) {
            socialLink = await prisma.socialLink.create({
                data: {
                    userId,
                    type: SocialLinkType.TIKTOK,
                },
            });
        }
        socialLink = await prisma.socialLink.update({
            where: { id: socialLink.id },
            data: {
                openId: tokens.open_id,
                accessToken: tokens.access_token,
                accessTokenExpiry: (tokens.expires_in * 1000 + new Date().getTime()).toString(),
                refreshToken: tokens.refresh_token,
                refreshTokenExpiry: (tokens.refresh_expires_in * 1000 + new Date().getTime()).toString(),
            },
        });
        return socialLink;
    }
}
