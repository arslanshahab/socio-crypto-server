import { checkPermissions } from "../middleware/authentication";
import { Transfer } from "../models/Transfer";
import { User } from "../models/User";
import { Wallet } from "../models/Wallet";
import { S3Client } from "../clients/s3";
import { SesClient } from "../clients/ses";
import { performCurrencyAction } from "./helpers";
import { BN } from "../util";
// import { Paypal } from "../clients/paypal";
// import { Response, Request } from "express";
import { Firebase } from "../clients/firebase";
import { WalletCurrency } from "../models/WalletCurrency";
import { getTokenPriceInUsd } from "../clients/ethereum";
import { performCoiinTransfer } from "./ethWithdraw";
import { v4 as uuidv4 } from "uuid";
import { TransferStatus } from "../util/constants";

export const start = async (
    parent: any,
    args: { withdrawAmount: number; ethAddress?: string; tokenSymbol?: string },
    context: { user: any }
) => {
    if (args.withdrawAmount <= 0) throw new Error("withdraw amount must be a positive number");
    const { tokenSymbol = "coiin" } = args;
    const normalizedTokenSymbol = tokenSymbol.toLowerCase();
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error("User not found");
    const wallet = await Wallet.findOneOrFail({ where: { user }, relations: ["transfers", "currency"] });
    const pendingBalance = await Transfer.getTotalPendingByWallet(wallet, normalizedTokenSymbol, true);
    const totalWithdrawThisYear = await Transfer.getTotalAnnualWithdrawalByWallet(wallet);
    // TODO: check if they have W9 on file
    let paypalEmail;
    if (!args.ethAddress) {
        let kycData;
        try {
            kycData = await S3Client.getUserObject(user.id);
        } catch (_) {
            kycData = null;
        }
        if (kycData) {
            paypalEmail = kycData["paypalEmail"];
        }
    }
    const currency = wallet.walletCurrency.find((currency) => currency.type === normalizedTokenSymbol);
    const currencyBalance = currency ? currency.balance : new BN(0);
    const tokenPrice = tokenSymbol === "coiin" ? 0.1 : await getTokenPriceInUsd(normalizedTokenSymbol);
    const withdrawAmountInUsd =
        tokenSymbol === "coiin"
            ? new BN(args.withdrawAmount).times(0.1)
            : new BN(args.withdrawAmount).times(tokenPrice);
    if (totalWithdrawThisYear.plus(withdrawAmountInUsd).gte(600) || pendingBalance.plus(withdrawAmountInUsd).gte(600))
        throw new Error("reached max withdrawals per year");
    if (currencyBalance.times(tokenPrice).minus(pendingBalance).minus(withdrawAmountInUsd).lt(0))
        throw new Error("wallet does not have required balance for this withdraw");
    const transfer = Transfer.newFromWithdraw(
        wallet,
        new BN(args.withdrawAmount),
        args.ethAddress,
        paypalEmail,
        args.ethAddress ? normalizedTokenSymbol : "usd",
        new BN(withdrawAmountInUsd)
    );
    await transfer.save();
    return transfer.asV1();
};

export const update = async (
    parent: any,
    args: { transferIds: string[]; status: "approve" | "reject" },
    context: { user: any }
) => {
    checkPermissions({ hasRole: ["admin"] }, context);
    if (args.transferIds.length === 0) throw new Error("empty array of transfer IDs provided");
    const transfers: Transfer[] = [];
    const userGroups: { [key: string]: any } = {};
    const payouts: { value: string; receiver: string; payoutId: string }[] = [];
    const rejected: { [key: string]: any } = {};
    for (let i = 0; i < args.transferIds.length; i++) {
        const transfer = await Transfer.findOne({
            where: { id: args.transferIds[i], action: "withdraw", status: "PENDING" },
            relations: ["wallet", "wallet.user", "wallet.user.profile", "wallet.user.notificationSettings"],
        });
        if (!transfer) throw new Error(`transfer not found: ${args.transferIds[i]}`);
        const walletCurrency = await WalletCurrency.getFundingWalletCurrency(
            transfer.currency == "usd" ? "coiin" : transfer.currency.toLowerCase(),
            transfer.wallet
        );
        if (args.status === "approve" && walletCurrency.balance.minus(transfer.amount).lt(0)) {
            const user = transfer.wallet.user;
            transfer.status = TransferStatus.REJECTED;
            if (user.notificationSettings.withdraw) {
                if (!rejected[user.id])
                    rejected[user.id] = { deviceToken: user.profile.deviceToken, total: new BN(transfer.amount) };
                else rejected[user.id].total.plus(transfer.amount);
            }
        } else {
            switch (args.status) {
                case "approve":
                    const user = transfer.wallet.user;
                    transfer.status = TransferStatus.APPROVED;
                    let kycData;
                    if (!userGroups[user.id]) {
                        try {
                            kycData = await S3Client.getUserObject(user.id);
                        } catch (_) {
                            kycData = null;
                        }
                    } else {
                        const totalRedeemedAmount = new BN(userGroups[user.id].totalRedeemedAmount);
                        userGroups[user.id].totalRedeemedAmount = totalRedeemedAmount.plus(transfer.amount);
                        userGroups[user.id].transfers.push(transfer);
                    }
                    if (kycData) {
                        const paymentMethod = transfer.ethAddress
                            ? { ethAddress: transfer.ethAddress }
                            : { paypalEmail: kycData["paypalEmail"] };
                        userGroups[user.id] = {
                            totalRedeemedAmount:
                                transfer.currency == "usd" ? transfer.amount.dividedBy(10) : transfer.amount.toString(),
                            user,
                            transfers: [transfer],
                            symbol: transfer.currency,
                        };
                        userGroups[user.id] = { ...userGroups[user.id], ...paymentMethod };
                        if (user.notificationSettings.withdraw)
                            userGroups[user.id].deviceToken = user.profile.deviceToken;
                        if (transfer.ethAddress) {
                            let transactionHash;
                            try {
                                transactionHash = await performCoiinTransfer(
                                    transfer.ethAddress,
                                    transfer.amount,
                                    transfer.currency
                                );
                            } catch (e) {
                                throw new Error(e);
                            }
                            if (!transactionHash) throw new Error("ethereum transfer failure");
                            transfer.transactionHash = transactionHash;
                        } else {
                            const payoutId = uuidv4();
                            payouts.push({
                                value: transfer.amount.toString(),
                                receiver: kycData["paypalEmail"],
                                payoutId,
                            });
                            transfer.currency = "usd";
                        }
                    }
                    await performCurrencyAction(
                        transfer.wallet.id,
                        transfer.currency === "usd" ? "coiin" : transfer.currency,
                        transfer.currency === "usd" ? transfer.amount.div(0.1).toString() : transfer.amount.toString(),
                        "debit"
                    );
                    break;
                case "reject":
                    transfer.status = TransferStatus.REJECTED;
                    if (!rejected[transfer.wallet.user.id])
                        rejected[transfer.wallet.user.id] = {
                            total: new BN(transfer.amount),
                            symbol: transfer.currency,
                        };
                    else rejected[transfer.wallet.user.id].total.plus(transfer.amount);
                    if (transfer.wallet.user.notificationSettings.withdraw)
                        rejected[transfer.wallet.user.id].deviceToken = transfer.wallet.user.profile.deviceToken;
                    break;
                default:
                    throw new Error("status provided is not valid");
            }
        }
        transfers.push(transfer);
    }
    for (const userId in userGroups) {
        const group = userGroups[userId];
        if (group.paypalEmail) {
            await SesClient.sendRedemptionConfirmationEmail(
                userId,
                group["paypalEmail"],
                parseFloat(new BN(group["totalRedeemedAmount"]).times(0.1).toString()).toFixed(2),
                group["transfers"]
            );
        }
        if (group.deviceToken)
            await Firebase.sendWithdrawalApprovalNotification(
                group.deviceToken,
                group.totalRedeemedAmount,
                group.symbol
            );
    }
    for (const userId in rejected) {
        if (rejected[userId].deviceToken)
            await Firebase.sendWithdrawalRejectionNotification(
                rejected[userId].deviceToken,
                rejected[userId].total,
                rejected[userId].symbol
            );
    }
    await Transfer.save(transfers);
    return transfers.map((transfer) => transfer.asV1());
};

export const getWithdrawals = async (parent: any, args: { status: string }, context: { user: any }) => {
    checkPermissions({ hasRole: ["admin"] }, context);
    const transfers = await Transfer.getWithdrawalsByStatus(args.status.toUpperCase());
    const uniqueUsers: { [key: string]: any } = {};
    for (let i = 0; i < transfers.length; i++) {
        const transfer = transfers[i];
        const userId = transfer.wallet.user.id;
        if (!uniqueUsers[userId]) {
            const totalWithdrawnThisYear = await Transfer.getTotalAnnualWithdrawalByWallet(transfer.wallet);
            const totalPendingWithdrawal = await Transfer.getTotalPendingByWallet(transfer.wallet, transfer.currency);
            let kycData: any;
            try {
                kycData = await S3Client.getUserObject(userId);
                if (kycData["hasIdProof"]) kycData["idProof"] = await S3Client.getKycImage(userId, "idProof");
                if (kycData["hasAddressProof"])
                    kycData["addressProof"] = await S3Client.getKycImage(userId, "addressProof");
            } catch (e) {
                kycData = null;
            }
            uniqueUsers[userId] = {
                kyc: kycData,
                user: { ...transfer.wallet.user, username: transfer.wallet.user.profile.username },
                totalPendingWithdrawal: totalPendingWithdrawal.toString(),
                totalAnnualWithdrawn: totalWithdrawnThisYear.toString(),
                transfers: [transfer.asV1()],
            };
        } else {
            uniqueUsers[userId].transfers.push(transfer.asV1());
        }
    }
    return Object.values(uniqueUsers);
};

export const getWithdrawalsV2 = async (parent: any, args: { status: string }, context: { user: any }) => {
    checkPermissions({ hasRole: ["admin"] }, context);
    const { status = "PENDING" } = args;
    const transfers = await Transfer.getWithdrawalsByStatus(status);
    const uniqueUsers: { [key: string]: any } = {};
    for (let i = 0; i < transfers.length; i++) {
        const transfer = transfers[i];
        const userId = transfer.wallet.user.id;
        if (!uniqueUsers[userId]) {
            const totalWithdrawnThisYear = await Transfer.getTotalAnnualWithdrawalByWallet(transfer.wallet);
            const totalPendingWithdrawal = await Transfer.getTotalPendingByCurrencyInUsd(transfer.wallet);
            uniqueUsers[userId] = {
                user: { ...transfer.wallet.user, username: transfer.wallet.user.profile.username },
                totalPendingWithdrawal: totalPendingWithdrawal,
                totalAnnualWithdrawn: totalWithdrawnThisYear.toString(),
                transfers: [transfer.asV1()],
            };
        } else {
            uniqueUsers[userId].transfers.push(transfer.asV1());
        }
    }
    return Object.values(uniqueUsers);
};

export const getWithdrawalHistory = async () => {
    const transfers = await Transfer.getAuditedWithdrawals();
    return transfers.map((transfer) => transfer.asV1());
};

// export const paypalWebhook = asyncHandler(async (req: Request, res: Response) => {
//     const { verification_status } = await Paypal.verify(req.headers, req.body);
//     if (verification_status === "SUCCESS") {
//         const body = req.body;
//         const payoutId = body["resource"]["payout_item"]["sender_item_id"];
//         const transfer = await Transfer.findOne({ where: { payoutId } });
//         if (!transfer) throw new Error("transfer not found");
//         switch (body["event_type"]) {
//             case "PAYMENT.PAYOUTS-ITEM.BLOCKED":
//                 transfer.payoutStatus = "BLOCKED";
//                 break;
//             case "PAYMENT.PAYOUTS-ITEM.CANCELED":
//                 transfer.payoutStatus = "CANCELED";
//                 break;
//             case "PAYMENT.PAYOUTS-ITEM.DENIED":
//                 transfer.payoutStatus = "DENIED";
//                 break;
//             case "PAYMENT.PAYOUTS-ITEM.FAILED":
//                 transfer.payoutStatus = "FAILED";
//                 break;
//             case "PAYMENT.PAYOUTS-ITEM.HELD":
//                 transfer.payoutStatus = "HELD";
//                 break;
//             case "PAYMENT.PAYOUTS-ITEM.REFUNDED":
//                 transfer.payoutStatus = "REFUNDED";
//                 break;
//             case "PAYMENT.PAYOUTS-ITEM.RETURNED":
//                 transfer.payoutStatus = "RETURNED";
//                 break;
//             case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
//                 transfer.payoutStatus = "SUCCEEDED";
//                 break;
//             case "PAYMENT.PAYOUTS-ITEM.UNCLAIMED":
//                 transfer.payoutStatus = "UNCLAIMED";
//                 break;
//             default:
//                 throw Error(`unknown event ${body["event_type"]}`);
//         }
//         await transfer.save();
//     } else {
//         throw Error("invalid webhook request");
//     }

//     res.status(200).json({ success: true });
// });

export const getWalletWithPendingBalance = async (
    _parent: any,
    args: { tokenSymbol: string },
    context: { user: any }
) => {
    const { tokenSymbol = "coiin" } = args;
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error("User not found");
    const wallet = await Wallet.findOneOrFail({ where: { user }, relations: ["transfers"] });
    const pendingBalance = await Transfer.getTotalPendingByWallet(wallet, tokenSymbol.toLowerCase());
    return wallet.asV1(pendingBalance.toString());
};
