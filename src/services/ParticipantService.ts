import { User } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { FindCampaignById, FindParticipantById } from "../types";
import { decrypt } from "../util/crypto";

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
    public async findParticipantById(params: FindParticipantById, user?: User) {
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
                id: params.id,
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
    public async findCampaignParticipants(params: FindCampaignById, user?: User) {
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
    public async findSocialPosts(params: any) {
        return this.prismaService.socialPost.findMany({
            where: {
                participantId: params,
            },
        });
    }
    public async findSocialLinkByUserId(userId: string, type: string) {
        let response: any = this.prismaService.socialLink.findFirst({
            where: {
                userId,
                type,
            },
        });
        let socialLink = await response;
        let apiKey = decrypt(socialLink.apiKey);
        let apiSecret = decrypt(socialLink.apiSecret);
        socialLink = { ...socialLink, apiKey, apiSecret };
        return socialLink;
    }
}
