import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { User } from "@prisma/client";
import { encrypt } from "../util/crypto";

@Injectable()
export class SocialLinkService {
    @Inject()
    private prismaService: PrismaService;

    public async findSocialLinkByUserId(userId: string, type?: string) {
        return await this.prismaService.socialLink.findFirst({
            where: { userId, type },
        });
    }
    public async addTwitterLink(user: User, apiKey: string, apiSecret: string) {
        const socialLink = await this.findSocialLinkByUserId(user.id, "twitter");
        return await this.prismaService.socialLink.upsert({
            where: { id: socialLink?.id },
            create: {
                userId: user.id,
                type: "twitter",
            },
            update: {
                apiKey: encrypt(apiKey),
                apiSecret: encrypt(apiSecret),
            },
        });
    }
}
