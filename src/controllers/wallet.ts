import { Admin } from "../models/Admin";
import { Org } from "../models/Org";
import { User } from "../models/User";

export const getFundingWallet = async (args: any, context: { user: any }) => {
    const { id } = context.user;
    const admin = await Admin.findOne({ where: { firebaseId: id } });
    if (!admin) throw new Error("user not found");
    const org = await Org.getByAdminId(admin.id);
    if (!org) throw Error("org not found");
    return org.wallet.asV1();
};

export const getUserWallet = async (args: any, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOne({ where: { id }, relations: ["wallet", "wallet.walletCurrency"] });
    if (!user) throw new Error("user not found");
    return user.wallet.asV1();
};
