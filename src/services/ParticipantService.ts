import { Campaign, Participant, User } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { FindCampaignById } from "../types";
import { encrypt } from "../util/crypto";
import { serverBaseUrl } from "../config";
import { TinyUrl } from "../clients/tinyUrl";
import { HourlyCampaignMetricsService } from "./HourlyCampaignMetricsService";

@Injectable()
export class ParticipantService {
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private hourlyCampaignMetricsService: HourlyCampaignMetricsService;

    /**
     * Retrieves a paginated list of participants
     *
     * @param params the search parameters for the participants
     * @param user an optional user include in the participants results (depends on params.userRelated)
     * @returns the list of participants, and a count of total participants, matching the parameters
     */
    public async findParticipantById(participantId: string, user?: User) {
        return this.prismaService.participant.findFirst({
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
                campaign: true,
            },
            where: {
                id: participantId,
                userId: user?.id,
            },
        });
    }
    public async findParticipantByCampaignId(campaignId: string) {
        return this.prismaService.participant.findFirst({
            where: {
                campaignId,
            },
            include: {
                user: {
                    include: {
                        profile: true,
                    },
                },
                campaign: true,
            },
        });
    }
    public async findCampaignParticipants(params: FindCampaignById) {
        const { campaignId, skip, take } = params;
        return this.prismaService.$transaction([
            this.prismaService.participant.findMany({
                where: {
                    campaignId,
                },
                include: {
                    user: true,
                    campaign: true,
                },
                skip,
                take,
            }),
            this.prismaService.participant.count({ where: { campaignId } }),
        ]);
    }
    public async findSocialPosts(participantId: string) {
        return this.prismaService.socialPost.findMany({
            where: {
                participantId: participantId,
            },
        });
    }

    public async findParticipantsCountByUserId(userId: string) {
        return this.prismaService.participant.count({
            where: {
                userId,
            },
        });
    }
    public async findParticipants(campaignId: string) {
        return this.prismaService.participant.findMany({
            where: { campaignId },
        });
    }
    public async findParticipantsByUserId(userId: string) {
        return this.prismaService.participant.findMany({
            where: { userId },
            include: {
                campaign: true,
            },
        });
    }
    public async findCampaignByUserId(userId: string) {
        return this.prismaService.participant.findMany({
            where: {
                userId,
            },
            include: {
                campaign: true,
            },
        });
    }

    public async deleteParticipant(campaignId: string) {
        return await this.prismaService.participant.deleteMany({
            where: {
                campaignId,
            },
        });
    }

    public async createNewParticipant(userId: string, campaign: Campaign, email?: string) {
        let participant = await this.prismaService.participant.create({
            data: {
                clickCount: "0",
                viewCount: "0",
                submissionCount: "0",
                participationScore: "0",
                userId,
                campaignId: campaign.id,
                email: email ? encrypt(email) : "",
            },
        });
        const url = `${serverBaseUrl}/v1/referral/${participant.id}`;
        const link = await TinyUrl.shorten(url);
        await this.hourlyCampaignMetricsService.upsertMetrics(campaign.id, campaign?.orgId!, "participate");
        participant = await this.prismaService.participant.update({
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

    public async findParticipantByUserAndCampaignIds(userId: string, campaignId: string) {
        return this.prismaService.participant.findFirst({
            where: {
                AND: [{ userId }, { campaignId }],
            },
        });
    }

    public async removeParticipant(participant: Participant) {
        return await this.prismaService.participant.delete({
            where: {
                id_campaignId_userId: {
                    id: participant.id,
                    campaignId: participant.campaignId,
                    userId: participant.userId,
                },
            },
        });
    }

    public async findParticipantsCount(campaignId?: string) {
        return this.prismaService.participant.count({
            where: campaignId ? { campaignId } : {},
        });
    }
}
