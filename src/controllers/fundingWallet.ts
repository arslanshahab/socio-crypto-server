import { Admin } from "../models/Admin";
import { TatumClient } from "../clients/tatumClient";
import { Wallet } from "../models/Wallet";
import { Currency } from "../models/Currency";
import { Transfer } from "../models/Transfer";
import { getCryptoAssestImageUrl } from "../util";
import { ADMIN_NOT_FOUND, FormattedError, ORG_NOT_FOUND, TRANSFER_NOT_FOUND } from "src/util/errors";

export const get = async (parent: any, args: any, context: { user: any }) => {
    try {
        const { id } = context.user;
        const admin = await Admin.findOne({
            where: { firebaseId: id },
            relations: ["org"],
        });
        if (!admin) throw new Error(ADMIN_NOT_FOUND);
        if (!admin.org) throw Error(ORG_NOT_FOUND);
        const wallet = await Wallet.findOne({ where: { org: admin.org } });
        const currencies = await Currency.find({ where: { wallet: wallet }, relations: ["token"] });
        const balances = await TatumClient.getBalanceForAccountList(currencies);
        let allCurrencies = currencies.map((currencyItem) => {
            const balance = balances.find((balanceItem) => currencyItem.tatumId === balanceItem.tatumId);
            const symbol = currencyItem?.token?.symbol || "";
            return {
                balance: balance.availableBalance,
                type: symbol,
                symbolImageUrl: getCryptoAssestImageUrl(symbol),
                network: currencyItem?.token?.network || "",
            };
        });
        return {
            currency: allCurrencies,
        };
    } catch (error) {
        throw new FormattedError(error);
    }
};
export const transactionHistory = async (parent: any, args: any, context: { user: any }) => {
    try {
        const { user } = context;
        const admin = await Admin.findOne({ where: { firebaseId: user.id }, relations: ["org"] });
        if (!admin) throw new Error(ADMIN_NOT_FOUND);
        const orgId = admin.org.id;
        const transfer = await Transfer.getTransactionHistory(orgId);
        if (!transfer) throw new Error(TRANSFER_NOT_FOUND);
        const transection = transfer.map((result) => result.asV1());
        return transection;
    } catch (error) {
        throw new FormattedError(error);
    }
};
