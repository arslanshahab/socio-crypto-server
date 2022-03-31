import { Get, Property, Required, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { XoxodayOrderModel } from ".prisma/client/entities";
// import { XoxodayService } from "../../services/XoxodayService";
import { UserService } from "../../services/UserService";
import { Pagination, SuccessResult } from "../../util/entities";
import { BadRequest } from "@tsed/exceptions";
import { USER_NOT_FOUND, MISSING_PARAMS } from "../../util/errors";
import { supportedCountries } from "../../util";
import { Xoxoday } from "../../clients/xoxoday";
import { getExchangeRateForCurrency } from "../../util/exchangeRate";
import { XoxodayVoucher } from "../../types";

class ListXoxoVariablesModel {
    @Required() public readonly country: string;
    @Required() public readonly page: number;
    @Property() public readonly userRelated: boolean | undefined;
}

@Controller("/xoxoday")
export class ParticipantController {
    @Inject()
    // private xoxodayService: XoxodayService;
    @Inject()
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(XoxodayOrderModel))
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
        return responseList;
    }
}

// helper methods are defined here related to this controller
const prepareVouchersList = async (list: Array<any>): Promise<Array<XoxodayVoucher>> => {
    let exchangeRate = "0";
    const currency = list.length ? list[0].currencyCode : "USD";
    if (list.length) {
        exchangeRate = await getExchangeRateForCurrency(currency);
    }
    return list.map((item) => {
        return {
            productId: item.productId,
            name: item.name.replace("&amp;", "&"),
            imageUrl: item.imageUrl,
            countryName: item.countryName,
            countryCode: item.countryCode,
            currencyCode: item.currencyCode,
            exchangeRate: exchangeRate,
            valueDenominations: item.valueDenominations.split(","),
        };
    });
};
