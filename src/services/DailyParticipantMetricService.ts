import { Injectable } from "@tsed/di";
import { Campaign, User, Participant, DailyParticipantMetric } from "@prisma/client";
import { prisma, readPrisma } from "../clients/prisma";
import { BN } from "../util/index";
import { BigNumber } from "bignumber.js";
import { ParticipantAction } from "../util/constants";
import { startOfDay } from "date-fns";
import { AggregatedCampaignMetricType } from "types.d.ts";

@Injectable()
export class DailyParticipantMetricService {
    public async getSortedByParticipantId(participantId: string) {
        return readPrisma.dailyParticipantMetric.findMany({
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
        return await prisma.dailyParticipantMetric.create({
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
        return readPrisma.dailyParticipantMetric.findMany({
            where: { participantId },
        });
    }
    public async getDailyParticipantByIds(participantIds: string[]) {
        return readPrisma.dailyParticipantMetric.findMany({
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
        return readPrisma.dailyParticipantMetric.findMany({
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

        const response = readPrisma.dailyParticipantMetric.findMany({
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
        return await prisma.dailyParticipantMetric.deleteMany({
            where: { id: { in: id } },
        });
    }

    public async findDailyParticipantByCampaignId(campaignId: string) {
        return readPrisma.dailyParticipantMetric.findMany({
            where: { campaignId },
        });
    }

    public async getAccumulatedParticipantMetrics(participantId: string) {
        const participants = await readPrisma.dailyParticipantMetric.findMany({ where: { participantId } });
        const { clickCount, likeCount, shareCount, viewCount, submissionCount, commentCount, participationScore } =
            participants.reduce(
                (sum, curr) => {
                    sum.clickCount += parseInt(curr.clickCount);
                    sum.likeCount += parseInt(curr.likeCount);
                    sum.shareCount += parseInt(curr.shareCount);
                    sum.viewCount += parseInt(curr.viewCount);
                    sum.submissionCount += parseInt(curr.submissionCount);
                    sum.commentCount += parseInt(curr.commentCount);
                    sum.participationScore += parseInt(curr.participationScore);
                    return sum;
                },
                {
                    clickCount: 0,
                    likeCount: 0,
                    shareCount: 0,
                    viewCount: 0,
                    submissionCount: 0,
                    commentCount: 0,
                    participationScore: 0,
                }
            );
        return { clickCount, likeCount, shareCount, viewCount, submissionCount, commentCount, participationScore };
    }

    public async upsertMetrics(data: {
        user: User;
        campaign: Campaign;
        participant: Participant;
        action: ParticipantAction;
        additiveParticipationScore: BigNumber;
        actionCount?: number;
    }): Promise<DailyParticipantMetric> {
        const { user, campaign, participant, action, additiveParticipationScore, actionCount = 1 } = data;

        if (!["clicks", "views", "submissions", "likes", "shares", "comments"].includes(action))
            throw new Error("action not supported");
        let record = await readPrisma.dailyParticipantMetric.findFirst({
            where: {
                participantId: participant.id,
                createdAt: { gte: startOfDay(new Date()) },
            },
        });
        if (!record) {
            record = await prisma.dailyParticipantMetric.create({
                data: { participantId: participant.id, userId: user.id, campaignId: campaign.id },
            });
        }
        let totalParticipationScore = participant.participationScore;
        let participationScore = participant.participationScore;
        let clickCount = record.clickCount;
        let viewCount = record.viewCount;
        let submissionCount = record.submissionCount;
        let likeCount = record.likeCount;
        let shareCount = record.shareCount;
        let commentCount = record.commentCount;
        switch (action) {
            case "clicks":
                clickCount = (
                    record.clickCount ? new BN(record.clickCount).plus(new BN(actionCount)) : new BN(actionCount)
                ).toString();
                break;
            case "views":
                viewCount = (
                    record.viewCount ? new BN(record.viewCount).plus(new BN(actionCount)) : new BN(actionCount)
                ).toString();
                break;
            case "submissions":
                submissionCount = (
                    record.submissionCount
                        ? new BN(record.submissionCount).plus(new BN(actionCount))
                        : new BN(actionCount)
                ).toString();
                break;
            case "likes":
                likeCount = (
                    record.likeCount ? new BN(record.likeCount).plus(new BN(actionCount)) : new BN(actionCount)
                ).toString();
                break;
            case "shares":
                shareCount = (
                    record.shareCount ? new BN(record.shareCount).plus(new BN(actionCount)) : new BN(actionCount)
                ).toString();
                break;
            case "comments":
                commentCount = (
                    record.commentCount ? new BN(record.commentCount).plus(new BN(actionCount)) : new BN(actionCount)
                ).toString();
                break;
        }
        participationScore = (
            record.participationScore
                ? new BN(record.participationScore).plus(additiveParticipationScore)
                : new BN(additiveParticipationScore)
        ).toString();
        return await prisma.dailyParticipantMetric.update({
            where: {
                id: record.id,
            },
            data: {
                totalParticipationScore: totalParticipationScore,
                participationScore,
                clickCount,
                shareCount,
                viewCount,
                likeCount,
                commentCount,
                submissionCount,
            },
        });
    }
    public async getAggregatedOrgMetrics(params: { orgId: string; startDate: Date; endDate: Date }) {
        const { orgId, startDate, endDate } = params;
        const result: AggregatedCampaignMetricType[] =
            await prisma.$queryRaw`SELECT sum(cast(d."clickCount" as int)) as "clickCount", sum(cast(d."viewCount" as int))
         as "viewCount", sum(cast(d."shareCount" as int)) as "shareCount", sum(cast(d."participationScore" as float)) as "participationScore" 
         FROM daily_participant_metric as d inner join campaign as c on d."campaignId"=c.id inner join org as o on c."orgId"=o.id where
        o.id=${orgId} and  c."createdAt" >= ${startDate} and c."createdAt" < ${endDate} group by o.id`;
        return result;
    }

    public async getOrgMetrics(params: { orgId: string; startDate: Date; endDate: Date }) {
        const { orgId, startDate, endDate } = params;
        const result: AggregatedCampaignMetricType[] =
            await prisma.$queryRaw`SELECT sum(cast(d."clickCount" as int)) as "clickCount", sum(cast(d."viewCount" as int))
            as "viewCount", sum(cast(d."shareCount" as int)) as "shareCount", sum(cast(d."participationScore" as float)) as "participationScore" 
            FROM daily_participant_metric as d inner join campaign as c on d."campaignId"=c.id inner join org as o on c."orgId"=o.id where
          o.id=${orgId} and c."createdAt" >= ${startDate} and c."createdAt" < ${endDate} group by c.id;`;
        return result;
    }

    public async getAggregatedCampaignMetrics(params: { campaignId: string; startDate: Date; endDate: Date }) {
        const { campaignId, startDate, endDate } = params;
        const result: AggregatedCampaignMetricType[] =
            await prisma.$queryRaw`SELECT c.name, COALESCE(sum(cast(d."clickCount" as int)),0) as "clickCount", COALESCE(sum(cast(d."viewCount" as int)),0) as "viewCount", 
            COALESCE(sum(cast(d."shareCount" as int)),0) as "shareCount", COALESCE(sum(cast(d."participationScore" as float)),0) as "participationScore" FROM
            daily_participant_metric as d right join campaign as c on d."campaignId"=c.id where c.id=${campaignId} and c."createdAt" >= ${startDate} and c."createdAt" < ${endDate} group by c.id;`;
        return result;
    }

    public async getCampaignMetrics(params: { campaignId: string; startDate: Date; endDate: Date }) {
        const { campaignId, startDate, endDate } = params;
        const result: AggregatedCampaignMetricType[] =
            await prisma.$queryRaw`SELECT  sum(cast(d."clickCount" as int)) as "clickCount", sum(cast(d."viewCount" as int))
         as "viewCount", sum(cast(d."shareCount" as int)) as "shareCount", sum(cast(d."participationScore" as float)) as "participationScore" 
         FROM daily_participant_metric as d where d."campaignId"=${campaignId} and d."createdAt" >= ${startDate} and d."createdAt" < ${endDate} group by d.id`;
        return result;
    }
}
