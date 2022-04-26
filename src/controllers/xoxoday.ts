import { Request, Response } from "express";
import { Xoxoday } from "../clients/xoxoday";
import { generateRandomId, supportedCountries, asyncHandler, BN } from "../util";
import { XoxodayOrder, XoxodayVoucher } from "src/types";
import { getExchangeRateForCurrency, getSymbolValueInUSD } from "../util/exchangeRate";
import { User } from "../models/User";
import { getSocialClient } from "./social";
import { S3Client } from "../clients/s3";
import { Transfer } from "../models/Transfer";
import { XoxodayOrder as XoxodayOrderModel } from "../models/XoxodayOrder";
import { TatumClient } from "../clients/tatumClient";
import { MISSING_PARAMS, USER_NOT_FOUND, FormattedError, INVALID_TOKEN, ERROR_LINKING_TWITTER } from "../util/errors";
import {
    BSC,
    COIIN,
    WEEK_LIMIT_USD_FOUR_MONTH_OLD_ACCOUNT,
    WEEK_LIMIT_USD_ONE_MONTH_OLD_ACCOUNT,
    WEEK_LIMIT_USD_TWO_MONTH_OLD_ACCOUNT,
    WEEK_LIMIT_USD_THREE_MONTH_OLD_ACCOUNT,
} from "../util/constants";
import { differenceInMonths } from "date-fns";

export const initXoxoday = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { code, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error(INVALID_TOKEN);
        const data = await Xoxoday.getAuthData(code);
        res.status(200).json(data);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

export const uploadXoxodayTokens = asyncHandler(async (req: Request, res: Response) => {
    try {
        const authData = req.body;
        if (!req.body.token || req.body.token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error(INVALID_TOKEN);
        const augmentedAuthData = Xoxoday.adjustTokenExpiry(authData);
        await S3Client.refreshXoxodayAuthData(augmentedAuthData);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(403).json(error.message);
    }
});

export const getXoxodayFilters = asyncHandler(async (req: Request, res: Response) => {
    try {
        const data = await Xoxoday.getFilters();
        res.status(200).json(data);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

export const getVouchers = async (parent: any, args: { country: string; page: number }, context: { user: any }) => {
    try {
        const { country, page } = args;
        if (!country) throw new Error(MISSING_PARAMS);
        const found = supportedCountries().find(
            (item) => item.name.toLowerCase() === country.toLowerCase() && item.enabled
        );
        if (!found) return [];
        const vouchers = await Xoxoday.getVouchers(found.filterValue, page);
        const responseList = await prepareVouchersList(vouchers);
        return responseList;
    } catch (error) {
        return [];
    }
};

export const placeOrder = async (parent: any, args: { cart: Array<any>; email: string }, context: { user: any }) => {
    try {
        const { cart, email } = args;
        if (!email) throw new Error(MISSING_PARAMS);
        const user = await User.findUserByContext(context.user, [
            "wallet",
            "wallet.walletCurrency",
            "campaigns",
            "socialLinks",
        ]);
        if (!user) throw new Error(USER_NOT_FOUND);
        if (!cart || !cart.length) throw new Error(MISSING_PARAMS);
        const totalUSDValue = cart.reduce((a, b) => a + (b.denomination || 0), 0);
        const totalCoiinSpent = parseFloat(totalUSDValue) / parseFloat(process.env.COIIN_VALUE || "0.2");
        await ifUserCanRedeem(user, totalCoiinSpent);
        const ordersData = await prepareOrderList(cart, email);
        const orderStatusList = await Xoxoday.placeOrder(ordersData);
        try {
            await user.updateCoiinBalance("SUBTRACT", totalCoiinSpent);
        } catch (error) {
            throw new Error("There was an error placing your order, please try again later.");
        }
        XoxodayOrderModel.saveOrderList(await prepareOrderEntities(cart, orderStatusList), user);
        await Transfer.newReward({
            wallet: user.wallet,
            symbol: "COIIN",
            amount: new BN(totalCoiinSpent),
            action: "XOXODAY_REDEMPTION",
            status: "SUCCEEDED",
        });
        return true;
    } catch (error) {
        throw new FormattedError(error);
    }
};

const prepareOrderEntities = async (cart: Array<any>, statusList: Array<any>): Promise<Array<any>> => {
    return cart.map((item, index) => {
        return {
            ...statusList[index],
            ...item,
        };
    });
};

export const redemptionRequirements = async (parent: any, args: {}, context: { user: any }) => {
    try {
        const user = await User.findUserByContext(context.user, ["campaigns", "socialLinks"]);
        if (!user) throw new Error(USER_NOT_FOUND);
        const recentOrder = await Transfer.getLast24HourRedemption(user.wallet, "XOXODAY_REDEMPTION");
        const twitterAccount = user.socialLinks.find((item) => item.type === "twitter");
        const socialClient = getSocialClient("twitter");
        const twitterFollowers = twitterAccount
            ? await socialClient.getTotalFollowers(twitterAccount, twitterAccount.id)
            : 0;
        return {
            twitterLinked: twitterAccount ? true : false,
            twitterfollowers: twitterFollowers,
            twitterfollowersRequirement: 20,
            participation: Boolean(user.campaigns.length),
            orderLimitForTwentyFourHoursReached: Boolean(recentOrder),
        };
    } catch (error) {
        throw new FormattedError(error);
    }
};

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

const prepareOrderList = async (list: Array<any>, email: string): Promise<Array<XoxodayOrder>> => {
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
};

const ifUserCanRedeem = async (user: User, totalCoiinSpent: number) => {
    if (!(await user.hasKycApproved()))
        throw new Error("You need to get your KYC approved before you can redeem vouchers.");
    const twitterAccount = user.socialLinks.find((item) => item.type === "twitter");
    if (!twitterAccount) throw new Error(ERROR_LINKING_TWITTER);
    const socialClient = getSocialClient("twitter");
    const twitterFollowers = await socialClient.getTotalFollowers(twitterAccount, twitterAccount.id);
    if (twitterFollowers < 20) throw new Error("You need to have atleast 20 followers on twitter before you redeem!");
    if (!user.campaigns.length) throw new Error("You need to participate in atleast one campaign in order to redeem!");
    const accountAgeInMonths = differenceInMonths(new Date(), user.createdAt) || 1;
    const coiinRedeemedInCurrentWeek = await Transfer.getCurrentWeekRedemption(user.wallet, "XOXODAY_REDEMPTION");
    const usdRedeemedCurrentWeek = await getSymbolValueInUSD(COIIN, coiinRedeemedInCurrentWeek + totalCoiinSpent);
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

    if (Boolean(await Transfer.getLast24HourRedemption(user.wallet, "XOXODAY_REDEMPTION")))
        throw new Error("You can only redeem once in 24 hours!");
    const userCurrency = await TatumClient.findOrCreateCurrency({ symbol: COIIN, network: BSC, wallet: user.wallet });
    const coiinBalance = new BN((await TatumClient.getAccountBalance(userCurrency.tatumId)).availableBalance);
    if (coiinBalance.isLessThanOrEqualTo(0) || coiinBalance.isLessThan(totalCoiinSpent))
        throw new Error("Not enough coiin balance to proceed with this transaction!");
};
