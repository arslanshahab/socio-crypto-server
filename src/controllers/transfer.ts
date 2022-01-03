import { User } from "../models/User";
import { Transfer } from "../models/Transfer";

export const getTransferHistory = async (
    parent: any,
    args: { symbol: string; skip: number; take: number },
    context: { user: any }
) => {
    const { id, userId } = context.user;
    let { symbol, skip = 0, take = 20 } = args;
    if (!symbol) throw new Error("symbol not found");
    const user = await User.findOne({ where: [{ identityId: id }, { id: userId }], relations: ["wallet"] });
    if (!user) throw new Error("user not found");
    const [data, count] = await Transfer.findAndCount({
        where: { currency: symbol.toUpperCase(), wallet: user.wallet },
        relations: ["wallet", "campaign"],
        skip: skip,
        take: take,
    });
    const results = data.map((item) => item.asV1());
    return {
        total: count,
        results,
    };
};
