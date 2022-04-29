import {
    Campaign,
    CampaignMedia,
    CampaignTemplate,
    CryptoCurrency,
    Currency,
    Participant,
    Token,
    Prisma,
} from "@prisma/client";
import { Get, Property, Required, Enum, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, PathParams, QueryParams } from "@tsed/common";
import { CampaignService } from "../../services/CampaignService";
import { UserService } from "../../services/UserService";
import { CampaignState, CampaignStatus } from "../../util/constants";
import { calculateTier } from "../helpers";
import { BN } from "../../util";
import { getTokenPriceInUsd } from "../../clients/ethereum";
import { CAMPAIGN_NOT_FOUND, ERROR_CALCULATING_TIER, USER_NOT_FOUND } from "../../util/errors";
import { PaginatedVariablesModel, Pagination, SuccessResult } from "../../util/entities";
import { CampaignMetricsResultModel, CampaignResultModel, CurrentCampaignModel } from "../../models/RestModels";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { ParticipantService } from "../../services/ParticipantService";
import { SocialPostService } from "../../services/SocialPostService";
import { CryptoCurrencyService } from "../../services/CryptoCurrencyService";
import { getTokenValueInUSD } from "../../util/exchangeRate";
import { Tiers } from "../../types";
import { getCryptoAssestImageUrl } from "../../util";

class ListCampaignsVariablesModel extends PaginatedVariablesModel {
    @Required() @Enum(CampaignState) public readonly state: CampaignState;
    @Property() @Enum(CampaignStatus, "ALL") public readonly status: CampaignStatus | "ALL" | undefined;
    @Property(Boolean) public readonly userRelated: boolean | undefined;
}
class ListCurrentCampaignVariablesModel {
    @Property() public readonly campaignId: string;
    @Property() public readonly userRelated: boolean | undefined;
}

async function getCampaignResultModel(
    campaign: Campaign & {
        participant?: Participant[];
        currency: (Currency & { token: Token | null }) | null;
        crypto_currency: CryptoCurrency | null;
        campaign_media: CampaignMedia[];
        campaign_template: CampaignTemplate[];
    }
) {
    const result: CampaignResultModel = campaign;
    if (result.coiinTotal) {
        const value = await getTokenValueInUSD(campaign.symbol, parseFloat(campaign.coiinTotal.toString()));
        result.coiinTotalUSD = value.toFixed(2);
    } else {
        result.coiinTotalUSD = "0";
    }

    if (campaign.currency) {
        result.network = campaign.currency.token?.network || "";
        result.symbol = campaign.currency.token?.symbol || "";
        result.symbolImageUrl = getCryptoAssestImageUrl(campaign.currency?.token?.symbol || "");
    }

    result.totalParticipationScore = parseInt(campaign.totalParticipationScore);
    if (campaign.socialMediaType) result.socialMediaType = JSON.parse(campaign.socialMediaType);
    if (campaign.keywords) result.keywords = JSON.parse(campaign.keywords);
    if (campaign.suggestedPosts) result.suggestedPosts = JSON.parse(campaign.suggestedPosts);
    if (campaign.suggestedTags) result.suggestedTags = JSON.parse(campaign.suggestedTags);

    return result;
}

@Controller("/campaign")
export class CampaignController {
    @Inject()
    private campaignService: CampaignService;
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private socialPostService: SocialPostService;
    @Inject()
    private cryptoCurrencyService: CryptoCurrencyService;
    @Inject()
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(CampaignResultModel))
    public async list(@QueryParams() query: ListCampaignsVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        const [items, total] = await this.campaignService.findCampaignsByStatus(query, user || undefined);
        const modelItems = await Promise.all(items.map((i) => getCampaignResultModel(i)));
        return new SuccessResult(new Pagination(modelItems, total, CampaignResultModel), Pagination);
    }

    @Get("/one/:id")
    @(Returns(200, SuccessResult).Of(CampaignResultModel))
    public async getOne(@PathParams("id") id: string) {
        const campaign = await this.campaignService.findCampaignById(id, {
            currency: { include: { token: true } },
            crypto_currency: true,
            campaign_media: true,
            campaign_template: true,
        });
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        return new SuccessResult(await getCampaignResultModel(campaign), CampaignResultModel);
    }

    @Get("/current-campaign-tier")
    @(Returns(200, SuccessResult).Of(CurrentCampaignModel))
    public async getCurrentCampaignTier(
        @QueryParams() query: ListCurrentCampaignVariablesModel,
        @Context() context: Context
    ) {
        const { campaignId } = query;
        let currentTierSummary;
        let currentCampaign: Campaign | null;
        let cryptoPriceUsd;
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        currentCampaign = await this.campaignService.findCampaignById(campaignId);
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
        return new SuccessResult(body, CurrentCampaignModel);
    }
    @Get("/campaign-metrics")
    @(Returns(200, SuccessResult).Of(CampaignMetricsResultModel))
    public async getCampaignMetrics(
        @QueryParams() query: ListCurrentCampaignVariablesModel,
        @Context() context: Context
    ) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { campaignId } = query;
        const participant = await this.participantService.findPaticipantMetricsById(campaignId);
        const clickCount = participant.reduce((sum, item) => sum + parseInt(item.clickCount), 0);
        const viewCount = participant.reduce((sum, item) => sum + parseInt(item.viewCount), 0);
        const submissionCount = participant.reduce((sum, item) => sum + parseInt(item.submissionCount), 0);
        const participantCount = participant.length;
        const socialPostMetrics = await this.socialPostService.findSocialPostMetricsById(campaignId);
        const likeCount = socialPostMetrics.reduce((sum, item) => sum + parseInt(item.likes), 0);
        const commentCount = socialPostMetrics.reduce((sum, item) => sum + parseInt(item.comments), 0);
        const shareCount = socialPostMetrics.reduce((sum, item) => sum + parseInt(item.shares), 0);
        const socialPostCount = socialPostMetrics.length;

        const metrics = {
            clickCount: clickCount || 0,
            viewCount: viewCount || 0,
            submissionCount: submissionCount || 0,
            likeCount: likeCount || 0,
            commentCount: commentCount || 0,
            shareCount: shareCount || 0,
            participantCount,
            postCount: socialPostCount,
        };
        return new SuccessResult(metrics, CampaignMetricsResultModel);
    }
}
