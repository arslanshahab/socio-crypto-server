import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { Campaign, User, Participant } from "@prisma/client";
// import { DateUtils } from "typeorm/util/DateUtils";
// import { MoreThan } from "typeorm";

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
    public async getSortedByUserId(userId: string, today: Boolean) {
        if (today) {
            let currentDate: Date | string = new Date();
            const month =
                currentDate.getUTCMonth() + 1 < 10
                    ? `0${currentDate.getUTCMonth() + 1}`
                    : currentDate.getUTCMonth() + 1;
            const day = currentDate.getUTCDate() < 10 ? `0${currentDate.getUTCDate()}` : currentDate.getUTCDate();
            const yyymmdd = `${currentDate.getUTCFullYear()}-${month}-${day}`;
            currentDate = `${yyymmdd} 00:00:00`;

            return this.prismaService.dailyParticipantMetric.findMany({
                where: {
                    userId,
                    createdAt: {
                        gt: new Date(currentDate),
                    },
                },
                orderBy: {
                    createdAt: "asc",
                },
            });
        } else {
            return this.prismaService.dailyParticipantMetric.findMany({
                where: {
                    userId,
                },
                orderBy: {
                    createdAt: "asc",
                },
            });
        }
    }
    public async getPreviousDayMetricsForAllCampaigns(campaignId: string[]) {
        const yesterdayDate = new Date();
        yesterdayDate.setDate(new Date().getDate() - 1);
        yesterdayDate.setHours(0);
        yesterdayDate.setMinutes(0);
        yesterdayDate.setSeconds(0);
        yesterdayDate.setMilliseconds(0);
        const yesterday = yesterdayDate.toISOString();
        const todayDate = new Date();
        todayDate.setHours(0);
        todayDate.setMinutes(0);
        todayDate.setSeconds(0);
        todayDate.setMilliseconds(0);
        const today = todayDate.toISOString();

        const response = this.prismaService.dailyParticipantMetric.findMany({
            where: {
                createdAt: { lt: new Date(today) },
                // createdAt: { lt: new Date(today), gte: new Date(yesterday) },
                campaign: {
                    id: {
                        in: campaignId,
                    },
                    endDate: { gte: new Date(yesterday) },
                },
            },
            include: { campaign: true, user: true },
            orderBy: {
                createdAt: "asc",
            },
        });
        return response;
    }
}
