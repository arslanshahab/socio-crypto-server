import { recoverPersonalSignature } from "eth-sig-util";
import { bufferToHex } from "ethereumjs-util";
import { Admin } from "../models/Admin";
import { Org } from "../models/Org";
import { ExternalAddress } from "../models/ExternalAddress";
import { User } from "../models/User";
import { Wallet } from "../models/Wallet";

export const attach = async (parent: any, args: { ethereumAddress: string }, context: { user: any }) => {
    const { id, method } = context.user;
    const address = args.ethereumAddress.toLowerCase();
    let isOrg = false;
    let user;
    if (method && method === "firebase") {
        const admin = await Admin.findOne({ where: { firebaseId: id } });
        if (!admin) throw new Error("user not found");
        user = await Org.getByAdminId(admin.id);
        isOrg = true;
    } else user = await User.findOne({ where: { identityId: id } });
    if (!user) throw new Error("user not found");
    if (await ExternalAddress.findOne({ where: { ethereumAddress: address } }))
        throw new Error("ethereum address already registered");
    let externalWallet: ExternalAddress;
    if (isOrg) {
        if ((user as Org).wallet) {
            externalWallet = ExternalAddress.newFromAttachment(address, (user as Org).wallet);
        } else {
            const wallet = new Wallet();
            wallet.org = user as Org;
            await wallet.save();
            externalWallet = ExternalAddress.newFromAttachment(address, wallet);
        }
    } else {
        externalWallet = ExternalAddress.newFromAttachment(address, user as User, true);
    }
    await externalWallet.save();
    return externalWallet.asV1();
};

export const claim = async (
    parent: any,
    args: { ethereumAddress: string; signature: string },
    context: { user: any }
) => {
    const { id, method } = context.user;
    const address = args.ethereumAddress.toLowerCase();
    let user;
    if (method === "firebase") {
        const admin = await Admin.findOne({ where: { firebaseId: id } });
        if (!admin) throw new Error("admin not found");
        user = await Org.getByAdminId(admin.id);
    } else user = await User.findOne({ where: { identityId: id } });
    if (!user) throw new Error("user not found");
    const externalWallet = await ExternalAddress.getByUserAndAddress(user, address, method === "firebase");
    if (!externalWallet) throw new Error("external wallet not found");
    if (externalWallet.claimed) throw new Error("external wallet already claimed");
    const msgBufferHex = bufferToHex(Buffer.from(externalWallet.claimMessage, "utf8"));
    const extractedAddress = recoverPersonalSignature({ data: msgBufferHex, sig: args.signature });
    if (extractedAddress.toLowerCase() !== address) throw new Error("invalid signature");
    externalWallet.claimed = true;
    await externalWallet.save();
    return externalWallet.asV1();
};

export const get = async (parent: any, args: { ethereumAddress: string }, context: { user: any }) => {
    const { id, method } = context.user;
    const address = args.ethereumAddress.toLowerCase();
    let user;
    if (method === "firebase") {
        const admin = await Admin.findOne({ where: { firebaseId: id } });
        if (!admin) throw new Error("user not found");
        user = await Org.getByAdminId(admin.id);
    } else user = await User.findOne({ where: { identityId: id } });
    if (!user) throw new Error("user not found");
    const externalWallet = await ExternalAddress.getByUserAndAddress(user, address, method === "firebase");
    if (!externalWallet) throw new Error("external wallet not found");
    return externalWallet.asV1();
};

export const list = async (parent: any, _args: any, context: { user: any }) => {
    const { id, method } = context.user;
    let isOrg = false;
    let user;
    if (method === "firebase") {
        const admin = await Admin.findOne({ where: { firebaseId: id } });
        if (!admin) throw new Error("user not found");
        user = await Org.getByAdminId(admin.id);
        isOrg = true;
    } else user = await User.findOne({ where: { identityId: id }, relations: ["addresses"] });
    if (!user) throw new Error("user not found");
    return isOrg && (user as Org).wallet.addresses
        ? (user as Org).wallet.addresses.map((address) => address.asV1())
        : (user as User) && (user as User).addresses
        ? (user as User).addresses.map((address) => address.asV1())
        : [];
};

export const remove = async (parent: any, args: { ethereumAddress: string }, context: { user: any }) => {
    const { id } = context.user;
    const wallet = await ExternalAddress.getWalletByAddressAndUserId(id, args.ethereumAddress);
    if (!wallet) throw new Error("external wallet not found");
    await wallet.remove();
    return true;
};
