import { asyncHandler } from "../util/helpers";
import { Request, Response } from "express";
import { Xoxoday } from "../clients/xoxoday";
import { generateRandomId, supportedCountries } from "../util/helpers";
import { XoxodayOrder, XoxodayVoucher } from "src/types";
import { getExchangeRateForCurrency } from "../util/exchangeRate";
import { XoxodayOrder as XoxodayOrderModel } from "../models/XoxodayOrder";
import { User } from "../models/User";
import { differenceInDays, differenceInHours } from "date-fns";
import { getSocialClient } from "./social";
import { S3Client } from "../clients/s3";

export const initXoxoday = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { code, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const data = await Xoxoday.getAuthData(code);
        res.status(200).json(data);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

export const uploadXoxodayTokens = asyncHandler(async (req: Request, res: Response) => {
    try {
        const authData = req.body;
        if (!req.body.token || req.body.token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
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
        if (!country) throw new Error("No country provided");
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
        const { id } = context.user;
        const user = await User.findOne({
            where: { identityId: id },
            relations: ["wallet", "wallet.walletCurrency", "campaigns", "orders"],
        });
        if (!user) throw new Error("No user found");
        if (!email) throw new Error("No email provided");
        if (!cart || !cart.length) throw new Error("Please provide some items to place an order.");
        const totalCoiinSpent = cart.reduce((a, b) => a + (b.coiinPrice || 0), 0);
        await ifUserCanRedeem(user, totalCoiinSpent);
        const ordersData = await prepareOrderList(cart, email);
        const orderStatusList = await Xoxoday.placeOrder(ordersData);
        const orderEntitiesList = await prepareOrderEntities(cart, orderStatusList);
        await user.updateCoiinBalance("subtract", totalCoiinSpent);
        XoxodayOrderModel.saveOrderList(orderEntitiesList, user);
        return { success: true };
    } catch (error) {
        console.log(error);
        return error;
    }
};

export const redemptionRequirements = async (parent: any, args: {}, context: { user: any }) => {
    try {
        const { id } = context.user;
        const user = await User.findOne({
            where: { identityId: id },
            relations: ["campaigns", "orders", "socialLinks"],
        });
        if (!user) throw new Error("No user found");
        const accountAgeInDays = differenceInDays(new Date(), new Date(user.createdAt));
        const maxParticipationValue = Math.max(
            ...user.campaigns.map((item) => (item.participationScore ? item.participationScore.toNumber() : 0)),
            0
        );
        const recentOrder = user.orders.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        const twitterAccount = user.socialLinks.find((item) => item.type === "twitter");
        const socialClient = getSocialClient("twitter");
        const twitterFollowers = twitterAccount
            ? await socialClient.getTotalFollowers(twitterAccount.asClientCredentials(), twitterAccount.id)
            : 0;
        return {
            accountAgeReached: accountAgeInDays >= 28,
            accountAge: accountAgeInDays,
            accountAgeRequirement: 28,
            twitterLinked: twitterAccount ? true : false,
            twitterfollowers: twitterFollowers,
            twitterfollowersRequirement: 20,
            participation: user.campaigns.length ? true : false,
            participationScore: maxParticipationValue,
            participationScoreRequirement: 20,
            orderLimitForTwentyFourHoursReached:
                recentOrder && differenceInHours(new Date(), new Date(recentOrder.createdAt)) < 24 ? true : false,
        };
    } catch (error) {
        console.log(error);
        return error;
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

const prepareOrderEntities = async (cart: Array<any>, statusList: Array<any>): Promise<Array<any>> => {
    return cart.map((item, index) => {
        return {
            ...statusList[index],
            ...item,
        };
    });
};

const ifUserCanRedeem = async (user: User, totalCoiinSpent: number) => {
    const accountAgeInDays = differenceInDays(new Date(), new Date(user.createdAt));
    if (accountAgeInDays < 28) {
        throw new Error("Your account needs to be 4 weeks old before you can redeem anything!");
    }
    const twitterAccount = user.socialLinks.find((item) => item.type === "twitter");
    if (!twitterAccount) {
        throw new Error("You need to link your twitter account before you redeem!");
    }
    const socialClient = getSocialClient("twitter");
    const twitterFollowers = await socialClient.getTotalFollowers(
        twitterAccount.asClientCredentials(),
        twitterAccount.id
    );
    if (twitterFollowers < 20) {
        throw new Error("You need to have atleast 20 followers on twitter before you redeem!");
    }
    const participations = user.campaigns.filter((item) => item.participationScore);
    const participationWithInfluence = participations.find((item) =>
        item.participationScore.isGreaterThanOrEqualTo(20)
    );
    if (!participationWithInfluence) {
        throw new Error(
            "You need to have an influence of atleast 20 in any of your participations before you redeem anything!"
        );
    }
    const recentOrder = user.orders.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    if (recentOrder && differenceInHours(new Date(), new Date(recentOrder.createdAt)) < 24) {
        throw new Error("You need to wait for few hours before you can redeem again!");
    }
    const userCoiins = user.wallet.walletCurrency.find((item) => item.type.toLowerCase() === "coiin");
    if (!userCoiins || userCoiins.balance.isLessThanOrEqualTo(0) || userCoiins.balance.isLessThan(totalCoiinSpent)) {
        throw new Error("Not enough coiin balance to proceed with this transaction!");
    }
};
