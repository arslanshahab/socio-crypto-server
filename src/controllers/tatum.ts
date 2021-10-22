import { TatumAccount } from "../models/TatumAccount";
import { TatumClient } from "../clients/tatumClient";
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
        const admin = await Admin.findOne({ where: { firebaseId: id }, relations: ["org", "org.tatumAccounts"] });
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
            relations: ["wallet", "wallet.currency"],
        });
        if (!user) throw new Error("User not found");
        let { currency, address, amount } = args;
        currency = currency.toUpperCase();
        const assetBalance = user.wallet.currency.find((item) => item.type === currency);
        if (!assetBalance) throw new Error(`No such currency:${currency} in user wallet`);
        if (assetBalance.balance.isLessThan(amount)) throw new Error(`Not enough funds in user account`);
        const tatumAccount = await TatumAccount.findOne({ where: { currency: currency } });
        if (!tatumAccount) throw new Error(`No account found for currency: ${currency}`);
        await TatumClient.createWithdrawRequest(tatumAccount.accountId, address, amount);
        return {
            success: true,
            message: "Withdraw request created",
        };
    } catch (error) {
        console.log("ERROR----", error);
        return error;
    }
};
