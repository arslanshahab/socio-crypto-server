import { Campaign, Participant, Prisma } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { FindCampaignById, ParticipantsRawQueryTypes } from "../types";
import { encrypt } from "../util/crypto";
import { serverBaseUrl } from "../config";
import { TinyUrl } from "../clients/tinyUrl";
import { HourlyCampaignMetricsService } from "./HourlyCampaignMetricsService";
import { PlatformCache } from "@tsed/common";
import { resetCacheKey } from "../util/index";
import { CacheKeys } from "../util/constants";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class ParticipantService {
    @Inject()
    private hourlyCampaignMetricsService: HourlyCampaignMetricsService;
    @Inject()
    private cache: PlatformCache;

    /**
     * Retrieves a paginated list of participants
     *
     * @param params the search parameters for the participants
     * @returns the list of participants, and a count of total participants, matching the parameters
     */
    public async findParticipantById<T extends Prisma.ParticipantInclude | undefined>(
        participantId: string,
        include?: T
    ) {
        return prisma.participant.findFirst({ where: { id: participantId }, include: include as T });
    }

    public async findParticipantByCampaignId<T extends Prisma.ParticipantInclude | undefined>(
        campaignId: string,
        userId?: string,
        include?: T
    ) {
        return prisma.participant.findFirst({
            where: {
                campaignId,
                userId: userId && userId,
            },
            include: include as T,
        });
    }

    public async findCampaignParticipants(params: FindCampaignById) {
        const { campaignId, skip, take } = params;
        return prisma.$transaction([
            prisma.participant.findMany({
                where: {
                    ...(campaignId && { campaignId }),
                    participationScore: { gt: "0" },
                },
                orderBy: {
                    participationScore: "desc",
                },
                include: {
                    user: {
                        include: { profile: true },
                    },
                    campaign: {
                        include: {
                            currency: { include: { token: true } },
                            campaign_media: true,
                            campaign_template: true,
                            crypto_currency: true,
                        },
                    },
                },
                skip,
                take,
            }),
            prisma.participant.count({
                where: { ...(campaignId && { campaignId }), participationScore: { gt: "0" } },
            }),
        ]);
    }

    public async findParticipantsCountByUserId(userId: string) {
        return prisma.participant.count({
            where: {
                userId,
            },
        });
    }
    public async findParticipants(campaignId: string) {
        return prisma.participant.findMany({
            where: { campaignId },
        });
    }
    public async findParticipantsByUserId<T extends Prisma.ParticipantInclude | undefined>(
        userId: string,
        include?: T
    ) {
        return prisma.participant.findMany({
            where: { userId },
            include: include as T,
        });
    }

    public async deleteParticipant(campaignId: string) {
        return await prisma.participant.deleteMany({
            where: {
                campaignId,
            },
        });
    }

    public async createNewParticipant(userId: string, campaign: Campaign, email?: string) {
        await resetCacheKey(CacheKeys.USER_RESET_KEY, this.cache);
        let participant = await prisma.participant.create({
            data: {
                clickCount: "0",
                viewCount: "0",
                submissionCount: "0",
                participationScore: "0",
                userId,
                campaignId: campaign.id,
                email: email && encrypt(email),
            },
        });
        const url = `${serverBaseUrl}/v1/referral/${participant.id}`;
        const link = await TinyUrl.shorten(url);
        await this.hourlyCampaignMetricsService.upsertMetrics(campaign.id, campaign?.orgId!, "participate");
        participant = await prisma.participant.update({
            where: {
                id_campaignId_userId: {
                    id: participant.id,
                    campaignId: participant.campaignId,
                    userId: participant.userId,
                },
            },
            data: {
                link,
            },
        });
        return participant;
    }

    public async removeParticipant(participant: Participant) {
        return await prisma.participant.delete({
            where: {
                id_campaignId_userId: {
                    id: participant.id,
                    campaignId: participant.campaignId,
                    userId: participant.userId,
                },
            },
        });
    }

    public async findParticipantsCount(campaignId?: string, campaignIds?: string[]) {
        return prisma.participant.count({
            where: campaignId ? { campaignId } : { campaignId: { in: campaignIds } },
        });
    }

    public async blacklistParticipant(params: { participantId: string; userId: string; campaignId: string }) {
        const { participantId, userId, campaignId } = params;
        return await prisma.participant.update({
            where: {
                id_campaignId_userId: {
                    id: participantId,
                    userId,
                    campaignId,
                },
            },
            data: {
                blacklist: true,
            },
        });
    }

    public async findParticipantsByCampaignId(
        campaignId: string,
        skip: number,
        take: number,
        filter: string,
        sort: "asc" | "desc"
    ) {
        const order = sort === "asc" ? Prisma.SortOrder.asc : Prisma.SortOrder.desc;
        const result: ParticipantsRawQueryTypes[] = await readPrisma.$queryRawUnsafe(
            `select p.id, u.id as "userId", c.id as "campaignId", p."participationScore", p.blacklist, u.email, pf.id as "profileId", pf.username,
        c.name as "campaignName", c."auditStatus" as "auditStatus", c.symbol as symbol, c.algorithm as "algorithm" from participant as p full join campaign as c on p."campaignId"=c.id full join public.user 
        as u on p."userId"=u.id full join profile as pf on u.id=pf."userId" where p."campaignId"=$1 AND (u.email ilike $2 
        OR pf.username ilike $2) order by p."participationScore"::numeric ${order}
        limit $3 offset $4`,
            campaignId,
            `%${filter}%`,
            take,
            skip
        );
        return result;
    }

    public async findParticipantCountByCampaignId(campaignId: string, filter: string) {
        return readPrisma.participant.count({
            where: { campaignId, user: { email: { contains: filter && filter, mode: "insensitive" } } },
        });
    }

    public async userParticipantionCount(userId: string) {
        return prisma.participant.count({
            where: { userId },
        });
    }

    public async getMetricsByCampaign(campaignId: string) {
        const result: { clickCount: number; viewCount: number; submissionCount: number }[] =
            await readPrisma.$queryRaw`Select sum(cast("clickCount" as int)) as "clickCount", sum(cast("viewCount" as int)) as "viewCount",
            sum(cast("submissionCount" as int)) as "submissionCount" from participant where "campaignId" = ${campaignId}`;
        return result;
    }

    public async getAverageClicks(campaignId: string) {
        const result: { clickCount: number }[] =
            await readPrisma.$queryRaw`SELECT avg(cast("clickCount" as int)) as "clickCount" from participant where "campaignId"=${campaignId}`;
        return result;
    }
}
