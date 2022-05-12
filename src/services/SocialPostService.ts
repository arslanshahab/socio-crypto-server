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
