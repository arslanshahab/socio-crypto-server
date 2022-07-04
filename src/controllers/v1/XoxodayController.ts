import { Get, Post, Property, Required, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { BodyParams, Context, PathParams, QueryParams } from "@tsed/common";
import { XoxodayService } from "../../services/XoxodayService";
import { UserService } from "../../services/UserService";
import { Pagination, SuccessResult } from "../../util/entities";
import { BadRequest } from "@tsed/exceptions";
import { USER_NOT_FOUND, MISSING_PARAMS, SERVICE_NOT_AVAILABLE } from "../../util/errors";
import { supportedCountries } from "../../util";
import { Xoxoday } from "../../clients/xoxoday";
import { RedemptionRequirementsModel, XoxodayVoucherResultModel } from "../../models/RestModels";
import { prepareVouchersList } from "../helpers";
import { ParticipantService } from "../../services/ParticipantService";
import { SocialClientType, TransferType } from "../../util/constants";
import { TwitterClient } from "../../clients/twitter";
import { PrismaService } from ".prisma/client/entities";
import { TransferService } from "../../services/TransferService";

const userResultRelations = ["social_link" as const];
class VoucherParams {
    @Property() public readonly country: string;
    @Property() public readonly page: number;
}

class RedemptionRequirementParam {
    @Required() public readonly userId: string;
}

class XoxodayOrderBody {
    @Required() public readonly email: string;
    @Required() public readonly cart: any[];
}

@Controller("/xoxoday")
export class XoxodayController {
    @Inject()
    private xoxodayService: XoxodayService;
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private userService: UserService;
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private transferService: TransferService;

    @Get("/voucher")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(XoxodayVoucherResultModel))
    public async getStoreVouchers(@QueryParams() query: VoucherParams, @Context() context: Context) {
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
        const { TWITTER } = SocialClientType;
        const user = await this.userService.findUserByContext(context.get("user"), userResultRelations);
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const recentOrder = await this.xoxodayService.getLast24HourRedemption("XOXODAY_REDEMPTION");
        const twitterAccount = user.social_link.find((item) => item.type === TWITTER);
        const twitterFollowers = twitterAccount
            ? await TwitterClient.getTotalFollowersV1(twitterAccount, twitterAccount.id)
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

    @Get("/redemption-requirements/:userId")
    @(Returns(200, SuccessResult).Of(RedemptionRequirementsModel))
    public async getRedemptionRequirementsByUserId(@PathParams() path: RedemptionRequirementParam) {
        const { userId } = path;
        const { TWITTER } = SocialClientType;
        const recentOrder = await this.xoxodayService.getLast24HourRedemption("XOXODAY_REDEMPTION");
        const socialLink = await this.prismaService.socialLink.findMany({
            where: { userId },
        });
        const twitterAccount = socialLink.find((item) => item.type === TWITTER);
        const twitterFollowers = twitterAccount
            ? await TwitterClient.getTotalFollowersV1(twitterAccount, twitterAccount.id)
            : 0;
        const participants = await this.participantService.findParticipantsCountByUserId(userId);
        const result = {
            twitterLinked: twitterAccount ? true : false,
            twitterfollowers: twitterFollowers,
            twitterfollowersRequirement: 20,
            participation: Boolean(participants),
            orderLimitForTwentyFourHoursReached: Boolean(recentOrder),
        };
        return new SuccessResult(result, RedemptionRequirementsModel);
    }

    @Post("/order")
    @(Returns(200, SuccessResult).Of(RedemptionRequirementsModel))
    public async placeOrder(@BodyParams() body: XoxodayOrderBody, @Context() context: Context) {
        if (SERVICE_NOT_AVAILABLE) throw new Error(SERVICE_NOT_AVAILABLE);
        const { cart, email } = body;
        if (!email) throw new Error(MISSING_PARAMS);
        const user = await this.userService.findUserByContext(context.get("user"), { wallet: true });
        if (!user) throw new Error(USER_NOT_FOUND);
        if (!cart || !cart.length) throw new Error(MISSING_PARAMS);
        const totalCoiinSpent = await this.xoxodayService.getCoiinSpendingOfCart(cart);
        await this.xoxodayService.ifUserCanRedeem(user, totalCoiinSpent);
        const ordersData = await this.xoxodayService.prepareOrderList(cart, email);
        const orderStatusList = await Xoxoday.placeOrder(ordersData);
        try {
            await this.userService.updateCoiinBalance(user, "SUBTRACT", totalCoiinSpent);
        } catch (error) {
            throw new Error("There was an error placing your order, please try again later.");
        }
        await this.xoxodayService.saveOrderList(cart, orderStatusList, user);
        await this.transferService.newReward({
            walletId: user.wallet?.id!,
            symbol: "COIIN",
            amount: totalCoiinSpent.toString(),
            action: "XOXODAY_REDEMPTION",
            status: "SUCCEEDED",
            type: TransferType.DEBIT,
        });
        return true;
    }
}
