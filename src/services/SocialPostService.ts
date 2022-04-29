import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class SocialPostService {
    @Inject()
    private prismaService: PrismaService;

    public async findSocialPostMetricsById(campaignId: string) {
        return this.prismaService.socialPost.findMany({
            where: { campaignId },
            // _sum: {
            //     likes: true,
            //     shares: true,
            //     comments: true,
            // },
            // _count: true,
        });
        // const { _sum, _count } = await response;
        // return { postSum: _sum, postCount: _count };
    }
    public async findSocialPostByParticipantId(participantId: string) {
        return this.prismaService.socialPost.findMany({
            where: { participantId },
        });
    }

    public async findSocialPostByCampaignId(campaignId: string) {
        return this.prismaService.socialPost.findMany({
            where: { campaignId },
        });
    }

    public async deleteSocialPost(campaignId: string) {
        return await this.prismaService.socialPost.deleteMany({
            where: { campaignId },
        });
    }
}
