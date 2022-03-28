import { Get, Property, Required, Enum, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { CampaignModel } from ".prisma/client/entities";
import { CampaignService } from "../../services/CampaignService";
import { UserService } from "../../services/UserService";
import { CampaignState, CampaignStatus } from "../../util/constants";
import { Pagination, SuccessResult } from "../../util/entities";
import { calculateTier } from "../helpers";
import { BN } from "../../util";
import { getTokenPriceInUsd } from "../../clients/ethereum";
import { ERROR_CALCULATING_TIER } from "../../util/errors";

class ListCampaignsVariablesModel {
    @Required() public readonly skip: number;
    @Required() public readonly take: number;
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
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(CampaignModel))
    public async list(@QueryParams() query: ListCampaignsVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        const [items, total] = await this.campaignService.findCampaignsByStatus(query, user || undefined);
        return new SuccessResult(new Pagination(items, total));
    }
}

@Controller("/currentCampaignTier")
export class CurrentCampaignTier {
    @Inject()
    private campaignService: CampaignService;
    @Inject()
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(CampaignModel))
    public async list(@QueryParams() query: ListCurrentCampaignVariablesModel, @Context() context: Context) {
        let { campaignId } = query;
        let currentTierSummary;
        let currentCampaign: any;
        let cryptoPriceUsd;
        const user = await this.userService.findUserByContext(context.get("user"));
        if (campaignId) {
            currentCampaign = await this.campaignService.findCampaignById(query, user || undefined);
            if (!currentCampaign) throw new Error("campaign not found");
            if (currentCampaign.type == "raffle") return { currentTier: -1, currentTotal: 0 };
            currentTierSummary = calculateTier(
                new BN(currentCampaign.totalParticipationScore),
                currentCampaign?.algorithm?.tiers
            );
            const cryptoCurrency = await this.campaignService.findCryptoCurrencyById(currentCampaign.cryptoId);
            const cryptoCurrencyType = cryptoCurrency?.type;
            if (cryptoCurrencyType) cryptoPriceUsd = await getTokenPriceInUsd(cryptoCurrencyType);
        }
        if (!currentTierSummary) throw new Error(ERROR_CALCULATING_TIER);
        let body: any = {
            currentTier: currentTierSummary.currentTier,
            currentTotal: parseFloat(currentTierSummary.currentTotal.toString()),
        };
        if (currentCampaign) body.campaignType = currentCampaign.type;
        if (cryptoPriceUsd) body.tokenValueUsd = cryptoPriceUsd.toString();
        if (cryptoPriceUsd) body.tokenValueCoiin = cryptoPriceUsd.times(10).toString();
        return new SuccessResult(body);
    }
}
