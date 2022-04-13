import { CampaignMedia, CampaignTemplate, Currency, Prisma, User } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { ListCampaignsVariablesV2 } from "../types";

@Injectable()
export class CampaignService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves a paginated list of campaigns
     *
     * @param params the search parameters for the campaigns
     * @param user an optional user include in the campaign results (depends on params.userRelated)
     * @returns the list of campaigns, and a count of total campaigns, matching the parameters
     */
    public async findCampaignsByStatus(params: ListCampaignsVariablesV2, user?: User) {
        const now = new Date();

        const where: Prisma.CampaignWhereInput = {
            ...(params.state === "OPEN" ? { endDate: { gte: now } } : {}),
            ...(params.state === "CLOSED" ? { endDate: { lte: now } } : {}),
            status: params.status || "APPROVED",
            isGlobal: false,
        };

        return this.prismaService.$transaction([
            this.prismaService.campaign.findMany({
                where,
                include: {
                    participant: params.userRelated
                        ? {
                              include: {
                                  user: {
                                      include: {
                                          profile: true,
                                      },
                                  },
                              },
                              where: { userId: user?.id },
                          }
                        : false,
                    crypto_currency: true,
                    campaign_media: true,
                    campaign_template: true,
                    currency: { include: { token: true } },
                },
                orderBy: { endDate: "desc" },
                skip: params.skip,
                take: params.take,
            }),
            this.prismaService.campaign.count({ where }),
        ]);
    }
    public async findCampaignById(campaignId: string) {
        return this.prismaService.campaign.findFirst({
            where: {
                id: {
                    equals: campaignId,
                },
            },
        });
    }
    public async findGlobalCampaign(isGlobal: true, symbol: string) {
        return this.prismaService.campaign.findFirst({
            where: {
                isGlobal,
                symbol,
            },
        });
    }
    public async findCampaingByName(name: string) {
        return this.prismaService.campaign.findFirst({
            where: {
                name: {
                    contains: name,
                    mode: "insensitive",
                },
            },
        });
    }
    public async createCampaign(
        name: string,
        beginDate: Date,
        endDate: Date,
        coiinTotal: string,
        target: string,
        description: string,
        instructions: string,
        campaignCompany: string,
        symbol: string,
        algorithm: object,
        tagline: string,
        requirements: any,
        suggestedPosts: string[],
        suggestedTags: string[],
        keywords: string[],
        type: string,
        imagePath: string,
        campaignType: string,
        socialMediaType: string[],
        isGlobal: boolean,
        showUrl: boolean,
        targetVideo: string,
        org: any,
        currency: Currency | any,
        campaignMedia: CampaignMedia,
        campaignTemplates: CampaignTemplate
    ) {
        console.log("campaign media............................../", campaignMedia);

        let response = await this.prismaService.campaign.create({
            include: {
                campaign_media: true,
            },
            data: {
                name: name,
                beginDate: new Date(beginDate),
                endDate: new Date(endDate),
                coiinTotal: coiinTotal.toString(),
                target: target,
                description: description,
                instructions,
                company: campaignCompany,
                symbol: symbol,
                algorithm: algorithm,
                tagline,
                requirements,
                suggestedPosts: suggestedPosts.toString(),
                suggestedTags: suggestedTags.toString(),
                keywords: keywords.toString(),
                type,
                imagePath,
                campaignType,
                socialMediaType: socialMediaType.toString(),
                isGlobal,
                showUrl,
                targetVideo,
                orgId: org.id,
                currencyId: currency.id,
                createdAt: new Date(),
                updatedAt: new Date(),
                campaign_media: {
                    create: campaignMedia,
                },
                campaign_template: {
                    create: campaignTemplates,
                },
                // campaign_template: {
                //     create: [
                //         {
                //             channel: campaignTemplates.channel,
                //             post: campaignTemplates.post,
                //             createdAt: new Date(),
                //             updatedAt: new Date(),
                //         },
                //     ],
                // },
            },
        });
        return await response;
    }
}
