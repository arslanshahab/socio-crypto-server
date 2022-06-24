import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { Campaign, User, Participant } from "@prisma/client";

@Injectable()
export class DailyParticipantMetricService {
    @Inject()
    private prismaService: PrismaService;

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
    public async getDailyParticipantById(participantId: string) {
        return this.prismaService.dailyParticipantMetric.findMany({
            where: { participantId },
        });
    }
    public async getDailyParticipantByIds(participantIds: string[]) {
        return this.prismaService.dailyParticipantMetric.findMany({
            where: {
                participantId: {
                    in: participantIds,
                },
            },
        });
    }
    public async getSortedByUserId(userId: string, today: Boolean) {
        let currentDate: Date | string = new Date();
        const month =
            currentDate.getUTCMonth() + 1 < 10 ? `0${currentDate.getUTCMonth() + 1}` : currentDate.getUTCMonth() + 1;
        const day = currentDate.getUTCDate() < 10 ? `0${currentDate.getUTCDate()}` : currentDate.getUTCDate();
        const yyymmdd = `${currentDate.getUTCFullYear()}-${month}-${day}`;
        currentDate = `${yyymmdd} 00:00:00`;
        const filter = today
            ? {
                  userId,
                  createdAt: {
                      gt: new Date(currentDate),
                  },
              }
            : {
                  userId,
              };
        return this.prismaService.dailyParticipantMetric.findMany({
            where: filter,
            orderBy: {
                createdAt: "asc",
            },
        });
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
                createdAt: { lt: new Date(today), gte: new Date(yesterday) },
                campaign: {
                    id: {
                        in: campaignId,
                    },
                    endDate: { gte: new Date(yesterday) },
                },
            },
            include: { campaign: true, user: true },
            orderBy: {
                createdAt: "desc",
            },
        });
        return response;
    }

    public async deleteDailyParticipantMetrics(id: string[]) {
        return await this.prismaService.dailyParticipantMetric.deleteMany({
            where: { id: { in: id } },
        });
    }

    public async findDailyParticipantByCampaignId(campaignId: string) {
        return this.prismaService.dailyParticipantMetric.findMany({
            where: { campaignId },
        });
    }

    public async getAggregatedOrgMetrics(campaignId?: string) {
        return this.prismaService.dailyParticipantMetric.findMany({
            where: campaignId ? { campaignId } : {},
            select: {
                clickCount: true,
                viewCount: true,
                shareCount: true,
                participationScore: true,
            },
        });
    }

    public async getOrgMetrics(campaignId?: string) {
        return this.prismaService.dailyParticipantMetric.findMany({
            where: campaignId ? { campaignId } : {},
            select: {
                clickCount: true,
                viewCount: true,
                shareCount: true,
                participationScore: true,
            },
        });
    }
}
