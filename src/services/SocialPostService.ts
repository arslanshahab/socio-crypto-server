import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class SocialPostService {
    @Inject()
    private prismaService: PrismaService;

    public async findSocialPostMetricsById(campaignId: string) {
        return this.prismaService.socialPost.findMany({
            where: { campaignId },
        });
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

    public async newSocialPost(id: string, type: string, participantId: string, userId: string, campaignId: string) {
        return await this.prismaService.socialPost.create({
            data: {
                id,
                type,
                participantId,
                userId,
                campaignId,
            },
        });
    }
    
    public async findUserSocialPostTime(userId: string) {
        return this.prismaService.socialPost.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: {
                createdAt: true,
            },
        });
    }
}
