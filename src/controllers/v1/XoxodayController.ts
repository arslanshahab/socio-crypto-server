import { Get, Property, Required, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { XoxodayService } from "../../services/XoxodayService";
import { UserService } from "../../services/UserService";
import { Pagination, SuccessResult } from "../../util/entities";
import { BadRequest } from "@tsed/exceptions";
import { USER_NOT_FOUND, MISSING_PARAMS } from "../../util/errors";
import { supportedCountries } from "../../util";
import { Xoxoday } from "../../clients/xoxoday";
import { RedemptionRequirementsModel, XoxodayVoucherResultModel } from "../../models/RestModels";
import { getSocialClient, prepareVouchersList } from "../helpers";
import { ParticipantService } from "../../services/ParticipantService";

const userResultRelations = ["social_link" as const];
class ListXoxoVariablesModel {
    @Required() public readonly country: string;
    @Required() public readonly page: number;
    @Property() public readonly userRelated: boolean | undefined;
}

@Controller("/xoxoday")
export class XoxodayController {
    @Inject()
    private xoxodayService: XoxodayService;
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private userService: UserService;

    @Get("/voucher")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(XoxodayVoucherResultModel))
    public async list(@QueryParams() query: ListXoxoVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const { country, page } = query;
        if (!country) throw new Error(MISSING_PARAMS);
        const found = supportedCountries().find(
            (item) => item.name.toLowerCase() === country.toLowerCase() && item.enabled
        );
        if (!found) return [];
        const vouchers = await Xoxoday.getVouchers(found.filterValue, page);
        const responseList = await prepareVouchersList(vouchers);
        return new SuccessResult(
            new Pagination(responseList, responseList.length, XoxodayVoucherResultModel),
            Pagination
        );
    }
    @Get("/redemption-requirements")
    @(Returns(200, SuccessResult).Of(RedemptionRequirementsModel))
    public async getRedemptionRequirements(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), userResultRelations);
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const recentOrder = await this.xoxodayService.getLast24HourRedemption("XOXODAY_REDEMPTION");
        const twitterAccount = user.social_link.find((item) => item.type === "twitter");
        const socialClient = getSocialClient("twitter");
        const twitterFollowers = twitterAccount
            ? await socialClient.getTotalFollowersV1(twitterAccount, twitterAccount.id)
            : 0;
        const participants = await this.participantService.findParticipantsCountByUserId(user.id);
        const result = {
            twitterLinked: twitterAccount ? true : false,
            twitterfollowers: twitterFollowers,
            twitterfollowersRequirement: 20,
            participation: Boolean(participants),
            orderLimitForTwentyFourHoursReached: Boolean(recentOrder),
        };
        return new SuccessResult(result, RedemptionRequirementsModel);
    }
}
