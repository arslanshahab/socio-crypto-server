import { Admin } from "../models/Admin";
import { concat } from "lodash";
import { TatumClient } from "../clients/tatumClient";
import { formatFloat } from "../util/helpers";

export const get = async (parent: any, args: any, context: { user: any }) => {
    const { id } = context.user;
    const admin = await Admin.findOne({
        where: { firebaseId: id },
        relations: ["org", "org.wallet", "org.tatumAccounts"],
    });
    if (!admin) throw new Error("Admin not found");
    const org = admin.org;
    if (!org) throw Error("org not found");
    const wallet = org.wallet.asV1();
    const currencies = wallet.currency.map((item) => ({
        balance: formatFloat(item.balance.toString(), 8),
        type: item.type,
    }));
    const tatumAccountIds = org.tatumAccounts.map((item) => item.accountId);
    const tatumAccountBalances = await TatumClient.getBalanceForAccountList(tatumAccountIds);
    const tatumCurrencies = org.tatumAccounts.map((currencyItem) => {
        const balance = tatumAccountBalances.find((balanceItem) => currencyItem.accountId === balanceItem.accountId);
        return {
            balance: formatFloat(balance.availableBalance, 8),
            type: currencyItem.currency,
        };
    });
    const all = concat(currencies, tatumCurrencies);
    return {
        ...wallet,
        currency: all,
    };
};
