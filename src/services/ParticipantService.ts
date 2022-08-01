import { Campaign, Participant, Prisma } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { FindCampaignById } from "../types";
import { encrypt } from "../util/crypto";
import { serverBaseUrl } from "../config";
import { TinyUrl } from "../clients/tinyUrl";
import { HourlyCampaignMetricsService } from "./HourlyCampaignMetricsService";
import { PlatformCache } from "@tsed/common";
import { resetCacheKey } from "../util/index";
import { CacheKeys } from "../util/constants";
import { prisma } from "../clients/prisma";

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

    public async findParticipantsByCampaignId(params: {
        campaignId: string;
        skip: number;
        take: number;
        filter: string;
    }) {
        const { campaignId, skip, take, filter } = params;
        return prisma.$transaction([
            prisma.participant.findMany({
                where: {
                    campaignId,
                    OR: [
                        {
                            user: {
                                email: { contains: filter && filter, mode: "insensitive" },
                            },
                        },
                        {
                            user: {
                                profile: { username: { contains: filter && filter, mode: "insensitive" } },
                            },
                        },
                    ],
                },
                select: {
                    id: true,
                    userId: true,
                    campaignId: true,
                    participationScore: true,
                    blacklist: true,
                    link: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            lastLogin: true,
                            profile: { select: { id: true, username: true } },
                        },
                    },
                    campaign: {
                        select: {
                            id: true,
                            coiinTotal: true,
                            name: true,
                            auditStatus: true,
                            symbol: true,
                            description: true,
                            algorithm: true,
                        },
                    },
                },
                skip,
                take,
            }),
            prisma.participant.count({
                where: { campaignId, user: { email: { contains: filter && filter, mode: "insensitive" } } },
            }),
        ]);
    }

    public async userParticipantionCount(userId: string) {
        return prisma.participant.count({
            where: { userId },
        });
    }
}
