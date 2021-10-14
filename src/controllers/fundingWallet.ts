import { Admin } from "../models/Admin";
import { concat } from "lodash";
import { TatumClient } from "../clients/tatumClient";

export const get = async (parent: any, args: any, context: { user: any }) => {
    const { id } = context.user;
    const admin = await Admin.findOne({
        where: { firebaseId: id },
        relations: ["org", "org.wallet", "org.tatumAccount"],
    });
    if (!admin) throw new Error("Admin not found");
    const org = admin.org;
    if (!org) throw Error("org not found");
    const wallet = org.wallet.asV1();
    const currencies = wallet.currency.map((item) => ({
        balance: parseFloat(item.balance.toString()),
        type: item.type,
    }));
    const tatumAccountIds = org.tatumAccount.map((item) => item.accountId);
    const tatumAccountBalances = await TatumClient.getBalanceOfAccountList(tatumAccountIds);
    console.log(tatumAccountBalances);
    const balances = org.tatumAccount.map((item) => ({ balance: parseFloat("0"), type: item.currency }));
    const all = concat(currencies, balances);
    return {
        ...wallet,
        currency: all,
    };
};
