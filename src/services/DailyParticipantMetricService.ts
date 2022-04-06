import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { Campaign, User, Participant } from "@prisma/client";

@Injectable()
export class DailyParticipantMetricService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves a user object from a JWTPayload
     *
     * @param data the jwt payload
     * @param include additional relations to include with the user query
     * @returns the user object, with the requested relations included
     */
    public async getSortedByParticipantId(participantId: string) {
        return this.prismaService.dailyParticipantMetric.findMany({
            where: {
                participantId,
            },
            orderBy: {
                createdAt: "asc",
            },
        });
    }
    public async createPlaceholderRow(
        date: Date | string,
        lastParticipationScore: string,
        campaign: Campaign,
        user: User,
        participant: Participant
    ) {
        return await this.prismaService.dailyParticipantMetric.create({
            data: {
                createdAt: new Date(date),
                updatedAt: new Date(date),
                participantId: participant.id,
                campaignId: campaign.id,
                userId: user.id,
                participationScore: 0,
                totalParticipationScore: lastParticipationScore,
                clickCount: 0,
                likeCount: 0,
                shareCount: 0,
                submissionCount: 0,
                viewCount: 0,
                commentCount: 0,
            },
        });
    }
    public async getAccumulatedParticipantMetrics(participantId: string) {
        return this.prismaService.dailyParticipantMetric.aggregate({
            where: { participantId },
            _sum: {
                clickCount: true,
                commentCount: true,
                likeCount: true,
                shareCount: true,
                submissionCount: true,
                viewCount: true,
                participationScore: true,
            },
        });
    }
    public async getAccumulatedMetricsByParticipantIds(participantIds: string[]) {
        return this.prismaService.dailyParticipantMetric.aggregate({
            where: {
                participantId: {
                    in: participantIds,
                },
            },
            _sum: {
                clickCount: true,
                commentCount: true,
                likeCount: true,
                shareCount: true,
                submissionCount: true,
                viewCount: true,
                participationScore: true,
            },
        });
    }
}
