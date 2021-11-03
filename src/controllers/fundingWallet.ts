import { Admin } from "../models/Admin";
import { TatumClient } from "../clients/tatumClient";
import { formatFloat } from "../util/helpers";
import { WalletCurrency } from "../models/WalletCurrency";
import { Wallet } from "../models/Wallet";
import { TatumAccount } from "../models/TatumAccount";

export const get = async (parent: any, args: any, context: { user: any }) => {
    const { id } = context.user;
    const admin = await Admin.findOne({
        where: { firebaseId: id },
        relations: ["org"],
    });
    if (!admin) throw new Error("Admin not found");
    const org = admin.org;
    if (!org) throw Error("org not found");
    const wallet = await Wallet.findOne({ where: { org: org } });
    const coiinCurrency = await WalletCurrency.findOne({
        where: { wallet: wallet, type: "coiin" },
    });
    const tatumAccounts = await TatumAccount.find({ where: { org: org } });
    const tatumAccountIds = tatumAccounts.map((item) => item.accountId);
    const tatumAccountBalances = await TatumClient.getBalanceForAccountList(tatumAccountIds);
    let allCurrencies = tatumAccounts.map((currencyItem) => {
        const balance = tatumAccountBalances.find((balanceItem) => currencyItem.accountId === balanceItem.accountId);
        return {
            balance: formatFloat(balance.availableBalance, 8),
            type: currencyItem.currency,
        };
    });
    if (coiinCurrency) {
        allCurrencies.unshift({
            type: coiinCurrency.type.toUpperCase() || "",
            balance: coiinCurrency.balance.toString() || "",
        });
    }
    return {
        ...wallet,
        currency: allCurrencies,
    };
};
