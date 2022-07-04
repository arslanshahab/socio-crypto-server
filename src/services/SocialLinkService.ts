import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { SocialLink, User } from "@prisma/client";
import { encrypt } from "../util/crypto";
import { decrypt } from "../util/crypto";
import { InternalServerError, NotFound } from "@tsed/exceptions";
import { SocialLinkType } from "../util/constants";

@Injectable()
export class SocialLinkService {
    @Inject()
    private prismaService: PrismaService;

    public async findSocialLinkByUserId(userId: string, type: SocialLinkType) {
        const response = this.prismaService.socialLink.findFirst({
            where: {
                userId,
                type,
            },
        });
        const socialLink: SocialLink | null = await response;
        if (!socialLink) throw new NotFound("Social Link not found");
        const apiKey = decrypt(socialLink.apiKey!);
        const apiSecret = decrypt(socialLink.apiSecret!);
        const { userId: slUserId } = socialLink;
        if (!slUserId) throw new InternalServerError("Invalid Social Link");
        return { ...socialLink, apiKey, apiSecret, userId: slUserId };
    }

    public async addTwitterLink(user: User, apiKey: string, apiSecret: string) {
        const socialLink = await this.prismaService.socialLink.findFirst({
            where: { userId: user.id, type: "twitter" },
        });
        if (socialLink) {
            return await this.prismaService.socialLink.update({
                where: { id: socialLink.id },
                data: {
                    apiKey: encrypt(apiKey),
                    apiSecret: encrypt(apiSecret),
                },
            });
        } else {
            return await this.prismaService.socialLink.create({
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
        const socialLink = await this.findSocialLinkByUserId(userId, type);
        return await this.prismaService.socialLink.delete({
            where: { id: socialLink.id },
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
        let socialLink = await this.prismaService.socialLink.findFirst({
            where: { userId, type: SocialLinkType.TIKTOK },
        });
        if (!socialLink) {
            socialLink = await this.prismaService.socialLink.create({
                data: {
                    userId,
                    type: SocialLinkType.TIKTOK,
                },
            });
        }
        socialLink = await this.prismaService.socialLink.update({
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
