import { Inject, Injectable } from "@tsed/di";
import { initDateFromParams } from "../util/date";
import { getCurrencyValueInUSD } from "../util/exchangeRate";
import { VerificationApplicationService } from "./VerificationApplicationService";
import {
    CustomError,
    KYC_LEVEL_2_NOT_APPROVED,
    ERROR_LINKING_TWITTER,
    TWITTER_FOLLOWERS_ARE_LESS_THAN_REQUIRED,
    USER_NEEDS_TO_PARTICIPATE_IN_CAMPAIGN,
    ALREADY_REDEEMED_IN_24_HOURS,
    NOT_ENOUGH_BALANCE_IN_ACCOUNT,
} from "../util/errors";
import { SocialLinkService } from "./SocialLinkService";
import { TwitterClient } from "../clients/twitter";
import { ParticipantService } from "./ParticipantService";
import { differenceInMonths } from "date-fns";
import { Prisma, User, Wallet } from "@prisma/client";
import { TransferService } from "./TransferService";
import { MarketDataService } from "./MarketDataService";
import {
    COIIN,
    WEEK_LIMIT_USD_ONE_MONTH_OLD_ACCOUNT,
    WEEK_LIMIT_USD_TWO_MONTH_OLD_ACCOUNT,
    WEEK_LIMIT_USD_THREE_MONTH_OLD_ACCOUNT,
    WEEK_LIMIT_USD_FOUR_MONTH_OLD_ACCOUNT,
    BSC,
    TransferAction,
    SocialLinkType,
    TWITTER_FOLLOWER_REQUIREMENT,
} from "../util/constants";
import { TatumService } from "./TatumService";
import { BN } from "../util";
import { generateRandomId } from "../util/index";
import { XoxodayOrder } from "src/types";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class XoxodayService {
    @Inject()
    private verificationApplicationService: VerificationApplicationService;
    @Inject()
    private socialLinkService: SocialLinkService;
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private transferService: TransferService;
    @Inject()
    private marketDataService: MarketDataService;
    @Inject()
    private tatumService: TatumService;

    public async getLast24HourRedemption(type: string) {
        const date = initDateFromParams({ date: new Date(), d: new Date().getDate() - 0, h: 0, i: 0, s: 0 });
        return readPrisma.transfer.findFirst({
            where: {
                action: type,
                createdAt: {
                    gt: date,
                },
            },
        });
    }

    public async getCoiinSpendingOfCart(cart: Array<any>) {
        const totalDenomination = cart.reduce((a, b) => a + (b.denomination || 0), 0);
        const totalUSDValue = await getCurrencyValueInUSD(cart[0].currencyCode, totalDenomination);
        return totalUSDValue / parseFloat(process.env.COIIN_VALUE || "0.2");
    }

    public async prepareOrderList(list: Array<any>, email: string): Promise<Array<XoxodayOrder>> {
        return list.map((item) => {
            return {
                poNumber: generateRandomId(),
                productId: item.productId,
                quantity: parseInt(item.quantity),
                denomination: parseInt(item.denomination),
                email: email,
                tag: "",
                contact: "",
                notifyAdminEmail: 1,
                notifyReceiverEmail: 1,
            };
        });
    }

    public async prepareOrderEntities(cart: Array<any>, statusList: Array<any>): Promise<Array<any>> {
        return cart.map((item, index) => {
            return {
                ...statusList[index],
                ...item,
            };
        });
    }

    public async saveOrderList(cart: Array<any>, statusList: Array<any>, user: User): Promise<Prisma.BatchPayload> {
        const list = await this.prepareOrderEntities(cart, statusList);
        const orders = [];
        for (let index = 0; index < list.length; index++) {
            const item = list[index];
            orders.push({
                xoxodayOrderId: item.orderId,
                orderTotal: item.orderTotal,
                currencyCode: item.currencyCode,
                coiinPrice: item.coiinPrice,
                poNumber: item.poNumber,
                productId: item.productId,
                quantity: item.quantity,
                denomination: item.denomination,
                userId: user.id,
            });
        }
        return await prisma.xoxodayOrder.createMany({ data: orders });
    }

    public async ifUserCanRedeem(user: User & { wallet: Wallet | null }, totalCoiinSpent: number) {
        if (!(await this.verificationApplicationService.isLevel2Approved(user.id)))
            throw new CustomError(KYC_LEVEL_2_NOT_APPROVED);
        const twitterAccount = await this.socialLinkService.findSocialLinkByUserAndType(
            user.id,
            SocialLinkType.TWITTER
        );
        if (!twitterAccount) throw new Error(ERROR_LINKING_TWITTER);
        const twitterFollowers = await TwitterClient.getTotalFollowersV1(twitterAccount, twitterAccount?.id);
        if (twitterFollowers < TWITTER_FOLLOWER_REQUIREMENT)
            throw new CustomError(TWITTER_FOLLOWERS_ARE_LESS_THAN_REQUIRED);
        if (!(await this.participantService.userParticipantionCount(user.id)))
            throw new CustomError(USER_NEEDS_TO_PARTICIPATE_IN_CAMPAIGN);
        const accountAgeInMonths = differenceInMonths(new Date(), user.createdAt) || 1;
        const coiinRedeemedInCurrentWeek = await this.transferService.getCurrentWeekRedemption(
            user.wallet?.id!,
            TransferAction.XOXODAY_REDEMPTION
        );
        const usdRedeemedCurrentWeek = await this.marketDataService.getTokenValueInUSD(
            COIIN,
            coiinRedeemedInCurrentWeek + totalCoiinSpent
        );
        if (accountAgeInMonths <= 1) {
            if (usdRedeemedCurrentWeek > WEEK_LIMIT_USD_ONE_MONTH_OLD_ACCOUNT)
                throw new Error(
                    `As your account is 1 month old, you can only redeem $${WEEK_LIMIT_USD_ONE_MONTH_OLD_ACCOUNT} worth of vouchers within a week.`
                );
        } else if (accountAgeInMonths === 2) {
            if (usdRedeemedCurrentWeek > WEEK_LIMIT_USD_TWO_MONTH_OLD_ACCOUNT)
                throw new Error(
                    `As your account is ${accountAgeInMonths} months old, you can only redeem $${WEEK_LIMIT_USD_TWO_MONTH_OLD_ACCOUNT} worth of vouchers within a week.`
                );
        } else if (accountAgeInMonths === 3) {
            if (usdRedeemedCurrentWeek > WEEK_LIMIT_USD_THREE_MONTH_OLD_ACCOUNT)
                throw new Error(
                    `As your account is ${accountAgeInMonths} months old, you can only redeem $${WEEK_LIMIT_USD_THREE_MONTH_OLD_ACCOUNT} worth of vouchers within a week.`
                );
        } else {
            if (usdRedeemedCurrentWeek >= WEEK_LIMIT_USD_FOUR_MONTH_OLD_ACCOUNT)
                throw new Error(
                    `You can only redeem $${WEEK_LIMIT_USD_FOUR_MONTH_OLD_ACCOUNT} worth of vouchers within a week.`
                );
        }
        if (
            Boolean(
                await this.transferService.getLast24HourRedemption(user.wallet?.id!, TransferAction.XOXODAY_REDEMPTION)
            )
        )
            throw new CustomError(ALREADY_REDEEMED_IN_24_HOURS);
        const userCurrency = await this.tatumService.findOrCreateCurrency({
            symbol: COIIN,
            network: BSC,
            wallet: user.wallet!,
        });
        const coiinBalance = new BN((await this.tatumService.getAccountBalance(userCurrency.tatumId)).availableBalance);
        if (coiinBalance.isLessThanOrEqualTo(0) || coiinBalance.isLessThan(totalCoiinSpent))
            throw new CustomError(NOT_ENOUGH_BALANCE_IN_ACCOUNT);
    }
}
