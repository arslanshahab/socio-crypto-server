import { Get, Property, Required, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { UserService } from "../../services/UserService";
import { Pagination, SuccessResult } from "../../util/entities";
import { BadRequest } from "@tsed/exceptions";
import { USER_NOT_FOUND, MISSING_PARAMS } from "../../util/errors";
import { supportedCountries } from "../../util";
import { Xoxoday } from "../../clients/xoxoday";
import { XoxodayVoucherResultModel } from "../../models/RestModels";
import { prepareVouchersList } from "../helpers";

class ListXoxoVariablesModel {
    @Required() public readonly country: string;
    @Required() public readonly page: number;
    @Property() public readonly userRelated: boolean | undefined;
}
@Controller("/xoxoday")
export class ParticipantController {
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
}
