import { asyncHandler } from "../util/helpers";
import { Request, Response } from "express";
import { Xoxoday } from "../clients/xoxoday";
import { generateRandomId, supportedCountries } from "../util/helpers";
import { XoxodayOrder, XoxodayVoucher } from "src/types";
import { getExchangeRate } from "../util/forex";
import { XoxodayOrder as XoxodayOrderModel } from "../models/XoxodayOrder";
import { User } from "../models/User";

export const initXoxoday = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        const data = await Xoxoday.getAuthData(code);
        res.status(200).json(data);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

// export const refreshTokens = asyncHandler(async (req: Request, res: Response) => {
//     try {
//         console.log("starting xoxoday tokens refresh.....");
//         const data = await Xoxoday.refreshAuthData();
//         res.status(200).json(data);
//     } catch (error) {
//         res.status(403).json(error.message);
//     }
// });

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
            relations: ["wallet", "wallet.currency"],
        });
        if (!user) throw new Error("No user found");
        if (!email) throw new Error("No email provided");
        if (!cart || !cart.length) throw new Error("Please provide some items to place an order.");
        const totalCoiinSpent = cart.reduce((a, b) => a + (b.coiinPrice || 0), 0);
        const userCoiins = user.wallet.currency.find((item) => item.type.toLowerCase() === "coiin");
        if (
            !userCoiins ||
            userCoiins.balance.isLessThanOrEqualTo(0) ||
            userCoiins.balance.isLessThan(totalCoiinSpent)
        ) {
            throw new Error("Not enough coiin balance to proceed with this transaction");
        }
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

// helper methods are defined here related to this controller
const prepareVouchersList = async (list: Array<any>): Promise<Array<XoxodayVoucher>> => {
    let exchangeRate = "0";
    const currency = list.length ? list[0].currencyCode : "USD";
    if (list.length) {
        exchangeRate = await getExchangeRate(currency);
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
