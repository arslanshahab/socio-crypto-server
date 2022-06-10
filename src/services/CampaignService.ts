import { Campaign, CampaignMedia, CampaignTemplate, Org, Prisma, User } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { CurrencyResultType, ListCampaignsVariablesV2, Tiers } from "../types";
import { CAMPAIGN_NOT_FOUND, CURRENCY_NOT_FOUND, ERROR_CALCULATING_TIER } from "../util/errors";
import { calculateTier } from "../controllers/helpers";
import { BN } from "../util";
import { getTokenPriceInUsd } from "../clients/ethereum";
import { CurrentCampaignModel } from "../models/RestModels";
import { CryptoCurrencyService } from "./CryptoCurrencyService";
import { CAMPAIGN_CREATION_AMOUNT } from "../clients/tatumClient";
import { TatumClientService } from "./TatumClientService";
import { UseCache } from "@tsed/common";

@Injectable()
export class CampaignService {
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private cryptoCurrencyService: CryptoCurrencyService;
    @Inject()
    private tatumClientService: TatumClientService;

    /**
     * Retrieves a paginated list of campaigns
     *
     * @param params the search parameters for the campaigns
     * @param user an optional user include in the campaign results (depends on params.userRelated)
     * @returns the list of campaigns, and a count of total campaigns, matching the parameters
     */
    @UseCache({ ttl: 3600, refreshThreshold: 900 })
    public async findCampaignsByStatus(params: ListCampaignsVariablesV2, user?: User) {
        const now = new Date();

        const where: Prisma.CampaignWhereInput = {
            ...(params.state === "OPEN" ? { endDate: { gte: now } } : {}),
            ...(params.state === "CLOSED" ? { endDate: { lte: now } } : {}),
            status: params.status || "APPROVED",
            isGlobal: false,
            auditStatus: params.auditStatus,
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
            this.prismaService.campaign.count({ where }),
        ]);
    }

    @UseCache({ ttl: 3600, refreshThreshold: 900 })
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

    @UseCache({ ttl: 3600, refreshThreshold: 900 })
    public async findGlobalCampaign(isGlobal: true, symbol: string) {
        return this.prismaService.campaign.findFirst({
            where: {
                isGlobal,
                symbol,
            },
            include: { org: true },
        });
    }
    @UseCache({ ttl: 3600, refreshThreshold: 900 })
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

    public async findCampaignsByOrgId(orgId: string) {
        return await this.prismaService.campaign.findMany({ where: { orgId } });
    }

    @UseCache({ ttl: 3600, refreshThreshold: 900 })
    public async currentCampaignTier(campaignId: string) {
        let currentTierSummary;
        let currentCampaign: Campaign | null;
        let cryptoPriceUsd;

        currentCampaign = await this.findCampaignById(campaignId);
        if (campaignId) {
            if (!currentCampaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
            if (currentCampaign.type == "raffle") return { currentTier: -1, currentTotal: 0 };
            currentTierSummary = calculateTier(
                new BN(currentCampaign.totalParticipationScore),
                (currentCampaign.algorithm as Prisma.JsonObject).tiers as Prisma.JsonObject as unknown as Tiers
            );
            if (currentCampaign.cryptoId) {
                const cryptoCurrency = await this.cryptoCurrencyService.findCryptoCurrencyById(
                    currentCampaign.cryptoId
                );
                const cryptoCurrencyType = cryptoCurrency?.type;
                if (!cryptoCurrencyType) throw new NotFound("Crypto currency not found");
                cryptoPriceUsd = await getTokenPriceInUsd(cryptoCurrencyType);
            }
        }
        if (!currentTierSummary) throw new BadRequest(ERROR_CALCULATING_TIER);
        let body: CurrentCampaignModel = {
            currentTier: currentTierSummary.currentTier,
            currentTotal: parseFloat(currentTierSummary.currentTotal.toString()),
            campaignType: null,
            tokenValueCoiin: null,
            tokenValueUsd: null,
        };
        if (currentCampaign) body.campaignType = currentCampaign.type;
        if (cryptoPriceUsd) body.tokenValueUsd = cryptoPriceUsd.toString();
        if (cryptoPriceUsd) body.tokenValueCoiin = cryptoPriceUsd.times(10).toString();
        return body;
    }

    public async isCampaignOpen(campaignId: string) {
        const campaign = await this.findCampaignById(campaignId);
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        const now = new Date();
        if (
            new Date(campaign.beginDate).getTime() <= now.getTime() &&
            new Date(campaign.endDate).getTime() >= now.getTime()
        )
            return true;
        return false;
    }

    public async findCampaigns() {
        return await this.prismaService.campaign.findMany({
            select: { id: true, name: true },
        });
    }

    public async blockCampaignAmount(campaignId: string) {
        const campaign = await this.findCampaignById(campaignId, { currency: true });
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        if (!campaign.currency) throw new NotFound(CURRENCY_NOT_FOUND);
        const blockageKey = `${CAMPAIGN_CREATION_AMOUNT}:${campaign.id}`;
        const blockedAmount = await this.tatumClientService.blockAccountBalance(
            campaign.currency.tatumId,
            campaign.coiinTotal,
            blockageKey
        );
        return blockedAmount.id;
    }

    public async adminUpdateCampaignStatus(campaignId: string, status: string, tatumBlockageId?: string) {
        return await this.prismaService.campaign.update({
            where: { id: campaignId },
            data: {
                status,
                tatumBlockageId,
            },
        });
    }
}
