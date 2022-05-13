import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { User } from "@prisma/client";
import { encrypt } from "../util/crypto";
// import { NotFound } from "@tsed/exceptions";
// import { SOCIAL_LINK_NOT_FOUND } from "../util/errors";

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
        // const socialLink = await this.findSocialLinkByUserId(user.id, "twitter");
        // if (!socialLink) throw new NotFound(SOCIAL_LINK_NOT_FOUND);
        // return await this.prismaService.socialLink.upsert({
        //     where: { id: socialLink.id },
        //     update: {
        //         apiKey: encrypt(apiKey),
        //         apiSecret: encrypt(apiSecret),
        //     },
        //     create: {
        //         userId: user.id,
        //         type: "twitter",
        //     },
        // });
        let socialLink = await this.findSocialLinkByUserId(user.id, "twitter");
        if (!socialLink) {
            socialLink = await this.prismaService.socialLink.create({
                data: {
                    userId: user.id,
                    type: "twitter",
                    apiKey: encrypt(apiKey),
                    apiSecret: encrypt(apiSecret),
                },
            });
        }
        return socialLink;
    }
}
