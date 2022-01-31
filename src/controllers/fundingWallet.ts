import { Admin } from "../models/Admin";
import { TatumClient } from "../clients/tatumClient";
import { Wallet } from "../models/Wallet";
import { Currency } from "../models/Currency";

export const get = async (parent: any, args: any, context: { user: any }) => {
    try {
        const { id } = context.user;
        const admin = await Admin.findOne({
            where: { firebaseId: id },
            relations: ["org"],
        });
        if (!admin) throw new Error("Admin not found");
        if (!admin.org) throw Error("Org not found");
        const wallet = await Wallet.findOne({ where: { org: admin.org } });
        const currencies = await Currency.find({ where: { wallet: wallet } });
        const balances = await TatumClient.getBalanceForAccountList(currencies);
        let allCurrencies = currencies.map((currencyItem) => {
            const balance = balances.find((balanceItem) => currencyItem.tatumId === balanceItem.tatumId);
            return {
                balance: balance.availableBalance,
                type: currencyItem.symbol,
            };
        });
        return {
            ...wallet,
            currency: allCurrencies,
        };
    } catch (error) {
        throw new Error(error.message);
    }
};
