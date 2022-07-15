import { CampaignMedia, CampaignTemplate, Org, Prisma, User } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { CurrencyResultType, ListCampaignsVariablesV2, Tiers } from "../types";
import { CAMPAIGN_NOT_FOUND, CURRENCY_NOT_FOUND, ERROR_CALCULATING_TIER } from "../util/errors";
import { calculateTier } from "../controllers/helpers";
import { BN, prepareCacheKey } from "../util";
import { CurrentCampaignTierModel } from "../models/RestModels";
import { TatumService } from "./TatumService";
import { PlatformCache, UseCache } from "@tsed/common";
import { CacheKeys, CampaignStatus, CAMPAIGN_CREATION_AMOUNT } from "../util/constants";
import { resetCacheKey } from "../util/index";
import { prisma } from "../clients/prisma";

@Injectable()
export class CampaignService {
    @Inject()
    private cache: PlatformCache;
    @Inject()
    private tatumService: TatumService;

    /**
     * Retrieves a paginated list of campaigns
     *
     * @param params the search parameters for the campaigns
     * @param user an optional user include in the campaign results (depends on params.userRelated)
     * @returns the list of campaigns, and a count of total campaigns, matching the parameters
     */
    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.CAMPAIGN_BY_STATUS_SERVICE, args),
    })
    public async findCampaignsByStatus(params: ListCampaignsVariablesV2, user?: User) {
        const now = new Date();

        const where: Prisma.CampaignWhereInput = {
            ...(params.state === "OPEN" ? { endDate: { gte: now } } : {}),
            ...(params.state === "CLOSED" ? { endDate: { lte: now } } : {}),
            status: params.status || "APPROVED",
            isGlobal: false,
            auditStatus: params.auditStatus,
        };

        return prisma.$transaction([
            prisma.campaign.findMany({
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
                        : true,
                    crypto_currency: true,
                    campaign_media: true,
                    campaign_template: true,
                    currency: { include: { token: true } },
                },
                orderBy: { endDate: "desc" },
                skip: params.skip,
                take: params.take,
            }),
            prisma.campaign.count({ where }),
        ]);
    }

    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.CAMPAIGN_BY_ID_SERVICE, args),
    })
    public async findCampaignById<T extends Prisma.CampaignInclude | undefined>(
        campaignId: string,
        include?: T,
        company?: string
    ) {
        return prisma.campaign.findFirst<{
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

    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.CAMPAIGN_GLOBAL_SERVICE, args),
    })
    public async findGlobalCampaign(isGlobal: true, symbol: string) {
        return prisma.campaign.findFirst({
            where: {
                isGlobal,
                symbol,
            },
            include: { org: true },
        });
    }

    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.CAMPAIGN_BY_NAME_SERVICE, args),
    })
    public async findCampaingByName(name: string) {
        return prisma.campaign.findFirst({
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
        algorithm: string,
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
        await resetCacheKey(CacheKeys.CAMPAIGN_RESET_KEY, this.cache);
        const response = await prisma.campaign.create({
            data: {
                name: name,
                beginDate: new Date(beginDate),
                endDate: new Date(endDate),
                coiinTotal: coiinTotal.toString(),
                target: target,
                description: description && description,
                instructions: instructions && instructions,
                company: campaignCompany,
                symbol: symbol,
                algorithm: JSON.parse(algorithm),
                tagline: tagline && tagline,
                requirements: requirements && requirements,
                suggestedPosts: suggestedPosts && JSON.stringify(suggestedPosts),
                suggestedTags: suggestedTags && JSON.stringify(suggestedTags),
                keywords: keywords && JSON.stringify(keywords),
                type,
                imagePath,
                campaignType,
                socialMediaType: JSON.stringify(socialMediaType),
                isGlobal,
                showUrl,
                targetVideo: targetVideo && targetVideo,
                orgId: org.id,
                currencyId: currency?.id,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: CampaignStatus.PENDING,
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
        algorithm: string,
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
        await resetCacheKey(CacheKeys.CAMPAIGN_RESET_KEY, this.cache);
        return await prisma.campaign.update({
            where: { id },
            data: {
                name: name && name,
                beginDate: beginDate && beginDate,
                endDate: endDate && endDate,
                target: target && target,
                description: description && description,
                instructions: instructions && instructions,
                algorithm: algorithm && JSON.parse(algorithm),
                targetVideo: targetVideo && targetVideo,
                imagePath: imagePath && imagePath,
                tagline: tagline && tagline,
                requirements: requirements && requirements,
                suggestedPosts: suggestedPosts && JSON.stringify(suggestedPosts),
                suggestedTags: suggestedTags && JSON.stringify(suggestedTags),
                keywords: keywords && JSON.stringify(keywords),
                campaignType: campaignType && campaignType,
                socialMediaType: socialMediaType && JSON.stringify(socialMediaType),
                showUrl,
                updatedAt: new Date(),
            },
        });
    }

    public async deleteCampaign(campaignId: string) {
        await resetCacheKey(CacheKeys.CAMPAIGN_RESET_KEY, this.cache);
        return await prisma.campaign.delete({
            where: { id: campaignId },
        });
    }

    public async updateCampaignStatus(campaignId: string) {
        await resetCacheKey(CacheKeys.CAMPAIGN_RESET_KEY, this.cache);
        return await prisma.campaign.update({
            where: {
                id: campaignId,
            },
            data: {
                auditStatus: "PENDING",
            },
        });
    }

    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.CAMPAIGN_BY_ORG_SERVICE, args),
    })
    public async findCampaignsByOrgId(orgId: string) {
        return await prisma.campaign.findMany({ where: { orgId } });
    }

    public async currentCampaignTier(campaignId: string) {
        const currentCampaign = await this.findCampaignById(campaignId);
        if (!currentCampaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        if (currentCampaign.type == "raffle") return { currentTier: -1, currentTotal: 0 };
        const currentTierSummary = calculateTier(
            new BN(currentCampaign.totalParticipationScore),
            (currentCampaign.algorithm as Prisma.JsonObject).tiers as Prisma.JsonObject as unknown as Tiers
        );
        if (!currentTierSummary) throw new BadRequest(ERROR_CALCULATING_TIER);
        let body: CurrentCampaignTierModel = {
            currentTier: currentTierSummary.currentTier,
            currentTotal: parseFloat(currentTierSummary.currentTotal.toString()),
            campaignType: currentCampaign.type,
            tokenValueCoiin: null,
            tokenValueUsd: null,
        };
        return body;
    }

    public async isCampaignOpen(campaignId: string) {
        const campaign = await this.findCampaignById(campaignId);
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        const now = new Date();
        if (new Date(campaign.endDate).getTime() >= now.getTime()) return true;
        return false;
    }

    public async findCampaigns() {
        return await prisma.campaign.findMany({
            select: { id: true, name: true },
        });
    }

    public async blockCampaignAmount(campaignId: string) {
        const campaign = await this.findCampaignById(campaignId, { currency: true });
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        if (!campaign.currency) throw new NotFound(CURRENCY_NOT_FOUND);
        const blockageKey = `${CAMPAIGN_CREATION_AMOUNT}:${campaign.id}`;
        const blockedAmount = await this.tatumService.blockAccountBalance(
            campaign.currency.tatumId,
            campaign.coiinTotal,
            blockageKey
        );
        return blockedAmount.id;
    }

    public async adminUpdateCampaignStatus(campaignId: string, status: string, tatumBlockageId?: string) {
        return await prisma.campaign.update({
            where: { id: campaignId },
            data: {
                status,
                tatumBlockageId,
            },
        });
    }
}
