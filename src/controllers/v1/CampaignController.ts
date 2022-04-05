import { Get, Property, Required, Enum, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
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

class ListCampaignsVariablesModel extends PaginatedVariablesModel {
    @Required() @Enum(CampaignState) public readonly state: CampaignState;
    @Property() @Enum(CampaignStatus, "ALL") public readonly status: CampaignStatus | "ALL" | undefined;
    @Property() public readonly userRelated: boolean | undefined;
}
class ListCurrentCampaignVariablesModel {
    @Property() public readonly campaignId: string;
    @Property() public readonly userRelated: boolean | undefined;
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
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(CampaignResultModel))
    public async list(@QueryParams() query: ListCampaignsVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        const [items, total] = await this.campaignService.findCampaignsByStatus(query, user || undefined);
        return new SuccessResult(new Pagination(items, total, CampaignResultModel), Pagination);
    }
    @Get("/current-campaign-tier")
    @(Returns(200, SuccessResult).Of(CurrentCampaignModel))
    public async currentCampaignTier(
        @QueryParams() query: ListCurrentCampaignVariablesModel,
        @Context() context: Context
    ) {
        let { campaignId } = query;
        let currentTierSummary;
        let currentCampaign: any;
        let cryptoPriceUsd;
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        currentCampaign = await this.campaignService.findCampaignById(query, user);
        if (campaignId) {
            if (!currentCampaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
            if (currentCampaign.type == "raffle") return { currentTier: -1, currentTotal: 0 };
            currentTierSummary = calculateTier(
                new BN(currentCampaign.totalParticipationScore),
                currentCampaign?.algorithm?.tiers
            );
            if (currentCampaign.cryptoId) {
                const cryptoCurrency = await this.campaignService.findCryptoCurrencyById(currentCampaign.cryptoId);
                const cryptoCurrencyType = cryptoCurrency?.type;
                if (!cryptoCurrencyType) throw new NotFound("Crypto currency not found");
                cryptoPriceUsd = await getTokenPriceInUsd(cryptoCurrencyType);
            }
        }
        if (!currentTierSummary) throw new BadRequest(ERROR_CALCULATING_TIER);
        let body: any = {
            currentTier: currentTierSummary.currentTier,
            currentTotal: parseFloat(currentTierSummary.currentTotal.toString()),
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
        // this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { campaignId } = query;
        const { _sum, _count } = await this.participantService.findPaticipantMetricsById(campaignId);
        const { postSum, postCount } = await this.socialPostService.findSocialPostMetricsById(campaignId);
        const metrics = {
            clickCount: _sum.clickCount,
            viewCount: _sum.viewCount,
            submissionCount: _sum.submissionCount,
            participantCount: _count,
            likeCount: postSum.likes,
            commentCount: postSum.comments,
            shareCount: postSum.shares,
            postCount,
        };
        return new SuccessResult(metrics, CampaignMetricsResultModel);
    }
}
