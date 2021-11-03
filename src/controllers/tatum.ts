import { TatumClient, USER_WITHDRAW, RAIINMAKER_WITHDRAW, WithdrawDetails } from "../clients/tatumClient";
import { Admin } from "../models/Admin";
import { asyncHandler } from "../util/helpers";
import { Request, Response } from "express";
import { TatumWallet } from "../models/TatumWallet";
import { User } from "../models/User";
import { S3Client } from "../clients/s3";
import { findOrCreateLedgerAccount } from "./controllerHelpers";
// import { TransactionType } from "@tatumio/tatum";

export const initWallet = asyncHandler(async (req: Request, res: Response) => {
    try {
        let { currency } = req.body;
        currency = currency.toUpperCase();
        const foundWallet = await TatumWallet.findOne({ where: { currency: currency } });
        if (foundWallet) throw new Error(`Wallet already exists for currency: ${currency}`);
        const wallet: any = await TatumClient.createWallet(currency);
        await TatumWallet.addTatumWallet({
            xpub: wallet.xpub || "",
            address: wallet.address || "",
            currency,
        });
        await S3Client.setTatumWalletKeys(currency, {
            ...wallet,
        });
        res.status(200).json(wallet);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

export const saveWallet = asyncHandler(async (req: Request, res: Response) => {
    try {
        let { mnemonic, secret, privateKey, xpub, address, currency, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        currency = currency.toUpperCase();
        const foundWallet = await TatumWallet.findOne({ where: { currency: currency } });
        if (foundWallet) throw new Error(`Wallet already exists for currency: ${currency}`);
        const wallet = await TatumWallet.addTatumWallet({ xpub, address, currency });
        await S3Client.setTatumWalletKeys(currency, {
            mnemonic,
            secret,
            privateKey,
            address,
            xpub,
        });
        res.status(200).json(wallet);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

export const getAccountTransactions = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { accountId, token, pageSize, offset } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const transactions = await TatumClient.getAccountTransactions(
            {
                id: accountId,
                // transactionType: TransactionType.CREDIT_DEPOSIT,
            },
            pageSize,
            offset
        );
        res.status(200).json(transactions);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const getAccountBalance = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { accountId, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const transactions = await TatumClient.getAccountBalance(accountId);
        res.status(200).json(transactions);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const listBlockedAmounts = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { accountId, token, pageSize = 50, offset = 0 } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const list = await TatumClient.getBlockedBalanceForAccount(accountId, pageSize, offset);
        res.status(200).json(list);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const unblockAccountBalance = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        await TatumClient.unblockAccountBalance(id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const blockAccountBalance = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id, amount, blockageKey, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const blockedAmount = await TatumClient.blockAccountBalance(id, amount, blockageKey);
        res.status(200).json(blockedAmount);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const getAllWithdrawls = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { currency, status, pageSize, offset, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const list = await TatumClient.listWithdrawls(status, currency, pageSize, offset);
        res.status(200).json(list);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const getSupportedCurrencies = async (parent: any, args: any, context: { user: any }) => {
    try {
        const { id } = context.user;
        const admin = await Admin.findOne({ where: { firebaseId: id } });
        if (!admin) throw new Error("Admin not found!");
        const supportedCurrencies = await TatumClient.getAllCurrencies();
        supportedCurrencies.unshift("COIIN");
        return supportedCurrencies;
    } catch (error) {
        console.log("ERROR----", error);
        return error;
    }
};

export const getDepositAddress = async (parent: any, args: { currency: string }, context: { user: any }) => {
    try {
        const { id } = context.user;
        const admin = await Admin.findOne({ where: { firebaseId: id }, relations: ["org"] });
        if (!admin) throw new Error("Admin not found!");
        let { currency } = args;
        currency = currency.toUpperCase();
        if (!currency) throw new Error("Currency not supported");
        const fromTatum = await TatumClient.isCurrencySupported(currency);
        if (!fromTatum) {
            return {
                currency: currency,
                address: process.env.ETHEREUM_DEPOSIT_ADDRESS,
                fromTatum,
                destinationTag: "",
                memo: "",
                message: "",
            };
        } else {
            const tatumAccount = await findOrCreateLedgerAccount(currency, admin.org);
            return {
                currency: currency,
                address: tatumAccount.address,
                fromTatum,
                destinationTag: tatumAccount.destinationTag,
                memo: tatumAccount.memo,
                message: tatumAccount.message,
            };
        }
    } catch (error) {
        console.log("ERROR----", error);
        return error;
    }
};

export const withdrawFunds = async (
    parent: any,
    args: { currency: string; address: string; amount: number },
    context: { user: any }
) => {
    try {
        const { id } = context.user;
        const user = await User.findOne({
            where: { identityId: id },
            relations: ["tatumAccounts"],
        });
        if (!user) throw new Error("User not found");
        let { currency, address, amount } = args;
        currency = currency.toUpperCase();
        if (!(await TatumClient.isCurrencySupported(currency)))
            throw new Error(`currency ${currency} is not supported`);
        const userAccount = user.tatumAccounts.find((item) => item.currency === currency);
        if (!userAccount) throw new Error(`No such currency:${currency} in user wallet`);
        const userAccountBalance = await TatumClient.getAccountBalance(userAccount.accountId);
        if (parseFloat(userAccountBalance.availableBalance) < amount)
            throw new Error(`Not enough funds in user account`);
        let payload: WithdrawDetails = {
            senderAccountId: userAccount.accountId,
            paymentId: `${USER_WITHDRAW}:${user.id}`,
            senderNote: RAIINMAKER_WITHDRAW,
            address,
            amount: getWithdrawableAmount(amount),
        };
        await TatumClient.withdrawFundsToBlockchain(currency, payload);
        return {
            success: true,
            message: "Withdraw completed successfully",
        };
    } catch (error) {
        console.log("ERROR----", error);
        return {
            success: false,
            message: "There was an error performing your withdraw",
        };
    }
};

const getWithdrawableAmount = (amount: number): string => {
    return (amount * 0.9).toString();
};
