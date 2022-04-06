import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class SocialPostService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves a user object from a JWTPayload
     *
     * @param data the jwt payload
     * @param include additional relations to include with the user query
     * @returns the user object, with the requested relations included
     */
    public async findSocialPostMetricsById(campaignId: string) {
        const response = this.prismaService.socialPost.aggregate({
            where: { campaignId },
            _sum: {
                likes: true,
                shares: true,
                comments: true,
            },
            _count: true,
        });
        const { _sum, _count } = await response;
        return { postSum: _sum, postCount: _count };
    }
    public async findSocialPostByParticipantId(participantId: string) {
        return this.prismaService.socialPost.findMany({
            where: { participantId },
        });
    }
}
