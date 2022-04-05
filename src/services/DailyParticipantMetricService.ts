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
                participationScore: "0",
                totalParticipationScore: lastParticipationScore,
            },
        });
    }
}
