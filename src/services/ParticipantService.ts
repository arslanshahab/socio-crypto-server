import { SocialLink, User } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { FindCampaignById } from "../types";
import { decrypt } from "../util/crypto";
import { InternalServerError, NotFound } from "@tsed/exceptions";

@Injectable()
export class ParticipantService {
    @Inject()
    private prismaService: PrismaService;

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
    public async findParticipantByCampaignId(params: FindCampaignById, user?: User) {
        return this.prismaService.participant.findFirst({
            where: {
                campaignId: params?.campaignId,
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
    public async findSocialLinkByUserId(userId: string, type: string) {
        const response = this.prismaService.socialLink.findFirst({
            where: {
                userId,
                type,
            },
        });
        const socialLink: SocialLink | null = await response;
        if (!socialLink) throw new NotFound("Social Link not found");
        const apiKey = decrypt(socialLink.apiKey!);
        const apiSecret = decrypt(socialLink.apiSecret!);
        const { userId: slUserId } = socialLink;
        if (!slUserId) throw new InternalServerError("Invalid Social Link");
        return { ...socialLink, apiKey, apiSecret, userId: slUserId };
    }

    public async findParticipantsCountByUserId(userId: string) {
        return this.prismaService.participant.count({
            where: {
                userId,
            },
        });
    }
    public async findPaticipantMetricsById(campaignId: string) {
        return this.prismaService.participant.findMany({
            where: { campaignId },
            // _sum: {
            //     clickCount: true,
            //     submissionCount: true,
            //     viewCount: true,
            // },
            // _count: true,
        });
    }
    public async findParticipantByUser(userId: string) {
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
}
