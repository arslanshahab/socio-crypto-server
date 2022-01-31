import { User } from "../models/User";
import { Transfer } from "../models/Transfer";
import { TransferAction } from "src/types";

export const getTransferHistory = async (
    parent: any,
    args: { symbol: string; skip: number; take: number },
    context: { user: any }
) => {
    let { symbol, skip = 0, take = 20 } = args;
    if (!symbol) throw new Error("symbol not found");
    const user = await User.findUserByContext(context.user, ["wallet"]);
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

export const getTransferHistoryV2 = async (
    parent: any,
    args: { symbol: string; type: TransferAction & "ALL"; skip: number; take: number },
    context: { user: any }
) => {
    let { symbol, type, skip = 0, take = 20 } = args;
    if (!symbol) throw new Error("symbol not found");
    const user = await User.findUserByContext(context.user, ["wallet"]);
    if (!user) throw new Error("user not found");
    const [data, count] = await Transfer.findAndCount({
        where: { currency: symbol.toUpperCase(), wallet: user.wallet, ...(type !== "ALL" && { action: type }) },
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
