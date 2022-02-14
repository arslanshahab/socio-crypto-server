import { User } from "../models/User";
import { Transfer } from "../models/Transfer";
import { TransferAction } from "src/types";
import { ILike } from "typeorm";

export const getTransferHistory = async (
    parent: any,
    args: { symbol: string; skip: number; take: number },
    context: { user: any }
) => {
    let { symbol, skip = 0, take = 20 } = args;
    const user = await User.findUserByContext(context.user, ["wallet"]);
    if (!user) throw new Error("user not found");
    const [data, count] = await Transfer.findAndCount({
        where: { ...(symbol && { currency: ILike(symbol) }), wallet: user.wallet },
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
    const user = await User.findUserByContext(context.user, ["wallet"]);
    if (!user) throw new Error("user not found");
    const [data, count] = await Transfer.findAndCount({
        where: {
            wallet: user.wallet,
            ...(symbol && { currency: ILike(symbol) }),
            ...(type !== "ALL" && { action: type }),
        },
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
