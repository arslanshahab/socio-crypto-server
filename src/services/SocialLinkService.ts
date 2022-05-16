import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { SocialLink, User } from "@prisma/client";
import { encrypt } from "../util/crypto";
import { decrypt } from "../util/crypto";
import { InternalServerError, NotFound } from "@tsed/exceptions";

@Injectable()
export class SocialLinkService {
    @Inject()
    private prismaService: PrismaService;

    public async findSocialLinkByUserId(userId: string, type: string) {
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
        let socialLink = await this.findSocialLinkByUserId(user.id, "twitter");
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
}
