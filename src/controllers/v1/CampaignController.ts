import { Get, Property, Required, Enum, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { CampaignService } from "../../services/CampaignService";
import { UserService } from "../../services/UserService";
import { CampaignState, CampaignStatus } from "../../util/constants";
import { Pagination, SuccessResult } from "../../util/entities";
import { CampaignResultModel } from "../../models/RestModels";

class ListCampaignsVariablesModel {
    @Required() public readonly skip: number;
    @Required() public readonly take: number;
    @Required() @Enum(CampaignState) public readonly state: CampaignState;

    @Property() @Enum(CampaignStatus, "ALL") public readonly status: CampaignStatus | "ALL" | undefined;
    @Property() public readonly userRelated: boolean | undefined;
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
        return new SuccessResult(new Pagination(items, total, CampaignResultModel), Pagination);
    }
}
