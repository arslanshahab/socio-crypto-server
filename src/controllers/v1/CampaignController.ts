import {
    Campaign,
    CampaignMedia,
    CampaignTemplate,
    CryptoCurrency,
    Currency,
    Participant,
    Token,
} from "@prisma/client";
import { Get, Property, Required, Enum, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { CampaignService } from "../../services/CampaignService";
import { UserService } from "../../services/UserService";
import { CampaignState, CampaignStatus } from "../../util/constants";
import { PaginatedVariablesModel, Pagination, SuccessResult } from "../../util/entities";
import { CampaignResultModel } from "../../models/RestModels";
import { getSymbolValueInUSD } from "../../util/exchangeRate";
import { getCryptoAssestImageUrl } from "../../util";

class ListCampaignsVariablesModel extends PaginatedVariablesModel {
    @Required() @Enum(CampaignState) public readonly state: CampaignState;
    @Property() @Enum(CampaignStatus, "ALL") public readonly status: CampaignStatus | "ALL" | undefined;
    @Property(Boolean) public readonly userRelated: boolean | undefined;
}

async function getCampaignResultModel(
    campaign: Campaign & {
        participant: Participant[];
        currency: (Currency & { token: Token | null }) | null;
        crypto_currency: CryptoCurrency | null;
        campaign_media: CampaignMedia[];
        campaign_template: CampaignTemplate[];
    }
) {
    const result: CampaignResultModel = campaign;
    if (result.coiinTotal) {
        const value = await getSymbolValueInUSD(campaign.symbol, parseFloat(campaign.coiinTotal.toString()));
        result.coiinTotalUSD = value.toFixed(2);
    } else {
        result.coiinTotalUSD = "0";
    }

    if (campaign.currency) {
        result.network = campaign.currency.token?.network || "";
        result.symbol = campaign.currency.token?.symbol || "";
        result.symbolImageUrl = getCryptoAssestImageUrl(campaign.currency?.token?.symbol || "");
    }

    return result;
}

@Controller("/campaign")
export class CampaignController {
    @Inject()
    private campaignService: CampaignService;

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
}
