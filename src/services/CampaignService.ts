import { CampaignMedia, CampaignTemplate, Org, Prisma, User } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { CurrencyResultType, ListCampaignsVariablesV2 } from "../types";

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

    public async findCampaignById<T extends Prisma.CampaignInclude | undefined>(
        campaignId: string,
        include?: T,
        company?: string
    ) {
        return this.prismaService.campaign.findFirst<{
            where: Prisma.CampaignWhereInput;
            // this type allows adding additional relations to result tpe
            include: T;
        }>({
            where: {
                id: {
                    equals: campaignId,
                },
                company,
            },
            include: include as T,
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
        requirements: object,
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
        org: Org,
        currency: CurrencyResultType | undefined,
        campaignMedia: CampaignMedia[],
        campaignTemplates: CampaignTemplate[]
    ) {
        const response = await this.prismaService.campaign.create({
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
                currencyId: currency?.id,
                createdAt: new Date(),
                updatedAt: new Date(),
                campaign_media: {
                    create: campaignMedia,
                },
                campaign_template: {
                    create: campaignTemplates,
                },
            },
        });
        return await response;
    }

    public async updateCampaign(
        id: string,
        name: string,
        beginDate: Date,
        endDate: Date,
        target: string,
        description: string,
        instructions: string,
        algorithm: object,
        targetVideo: string,
        imagePath: string,
        tagline: string,
        requirements: object,
        suggestedPosts: string[],
        suggestedTags: string[],
        keywords: string[],
        campaignType: string,
        socialMediaType: string[],
        showUrl: boolean
    ) {
        return await this.prismaService.campaign.update({
            where: { id },
            data: {
                name,
                beginDate,
                endDate,
                target,
                description,
                instructions,
                algorithm,
                targetVideo,
                imagePath,
                tagline,
                requirements,
                suggestedPosts: suggestedPosts.toString(),
                suggestedTags: suggestedTags.toString(),
                keywords: keywords.toString(),
                campaignType,
                socialMediaType: socialMediaType.toString(),
                showUrl,
                updatedAt: new Date(),
            },
        });
    }
    public async updateCampaignTemplate(campaignTemplates: CampaignTemplate) {
        return await this.prismaService.campaignTemplate.update({
            where: { id: campaignTemplates.id },
            data: {
                post: campaignTemplates.post,
                updatedAt: new Date(),
            },
        });
    }
    public async updateCampaignMedia(campaignMedia: CampaignMedia) {
        return await this.prismaService.campaignMedia.update({
            where: {
                id: campaignMedia.id,
            },
            data: {
                channel: campaignMedia.channel,
                media: campaignMedia.media,
                mediaFormat: campaignMedia.mediaFormat,
                isDefault: campaignMedia.isDefault,
                updatedAt: new Date(),
            },
        });
    }
    public async updateNewCampaignTemplate(campaignTemplate: CampaignTemplate, campaignId: string) {
        return await this.prismaService.campaignTemplate.create({
            data: {
                channel: campaignTemplate.channel,
                post: campaignTemplate.post,
                campaignId,
                updatedAt: new Date(),
            },
        });
    }
    public async updateNewCampaignMedia(campaignMedia: CampaignMedia, campaignId: string) {
        return await this.prismaService.campaignMedia.create({
            data: {
                channel: campaignMedia.channel,
                media: campaignMedia.media,
                mediaFormat: campaignMedia.mediaFormat,
                isDefault: campaignMedia.isDefault,
                campaignId,
                updatedAt: new Date(),
            },
        });
    }
    public async findCampaignMediaById(campaignMediaId: string) {
        return this.prismaService.campaignMedia.findFirst({
            where: { id: campaignMediaId },
        });
    }

    public async findCampaignTemplateById(campaignTemplateId: string) {
        return this.prismaService.campaignTemplate.findFirst({
            where: { id: campaignTemplateId },
        });
    }

    public async deleteCampaign(campaignId: string) {
        return await this.prismaService.campaign.delete({
            where: { id: campaignId },
        });
    }

    public async updateCampaignStatus(campaignId: string) {
        return await this.prismaService.campaign.update({
            where: {
                id: campaignId,
            },
            data: {
                auditStatus: "PENDING",
            },
        });
    }
}
