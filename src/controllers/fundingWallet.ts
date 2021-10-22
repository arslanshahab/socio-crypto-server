import { Admin } from "../models/Admin";
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
    const coiinCurrency = wallet.currency.find((item) => item.type.toLowerCase() === "coiin");
    const tatumAccountIds = org.tatumAccounts.map((item) => item.accountId);
    const tatumAccountBalances = await TatumClient.getBalanceForAccountList(tatumAccountIds);
    let allCurrencies = org.tatumAccounts.map((currencyItem) => {
        const balance = tatumAccountBalances.find((balanceItem) => currencyItem.accountId === balanceItem.accountId);
        return {
            balance: formatFloat(balance.availableBalance, 8),
            type: currencyItem.currency,
        };
    });
    allCurrencies.unshift({ type: coiinCurrency?.type || "", balance: coiinCurrency?.balance.toString() || "" });
    return {
        ...wallet,
        currency: allCurrencies,
    };
};
