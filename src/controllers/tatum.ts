import { TatumClient, USER_WITHDRAW, RAIINMAKER_WITHDRAW, WithdrawDetails } from "../clients/tatumClient";
import { Admin } from "../models/Admin";
import { asyncHandler } from "../util/helpers";
import { Request, Response } from "express";
import { TatumWallet } from "../models/TatumWallet";
import { User } from "../models/User";
import { S3Client } from "../clients/s3";
import { findOrCreateCurrency, getWithdrawableAmount } from "./controllerHelpers";
import { Currency } from "../models/Currency";
import { Transfer } from "../models/Transfer";
import { BigNumber } from "bignumber.js";

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
        const balance = await TatumClient.getAccountBalance(accountId);
        res.status(200).json(balance);
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

export const transferBalance = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { toAccount, fromAccount, amount, note, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const data = await TatumClient.transferFunds(fromAccount, toAccount, amount, note);
        res.status(200).json(data);
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

export const getDepositAddress = async (parent: any, args: { symbol: string }, context: { user: any }) => {
    try {
        const { id } = context.user;
        const admin = await Admin.findOne({ where: { firebaseId: id }, relations: ["org", "org.wallet"] });
        if (!admin) throw new Error("Admin not found!");
        let { symbol } = args;
        symbol = symbol.toUpperCase();
        if (!symbol) throw new Error("Currency not supported");
        const fromTatum = await TatumClient.isCurrencySupported(symbol);
        if (!fromTatum) {
            return {
                symbol,
                address: process.env.ETHEREUM_DEPOSIT_ADDRESS,
                fromTatum,
                destinationTag: "",
                memo: "",
                message: "",
            };
        } else {
            const ledgerAccount = await findOrCreateCurrency(symbol, admin.org.wallet);
            return {
                symbol,
                address: ledgerAccount.depositAddress,
                fromTatum,
                destinationTag: ledgerAccount.destinationTag,
                memo: ledgerAccount.memo,
                message: ledgerAccount.message,
            };
        }
    } catch (error) {
        console.log("ERROR----", error);
        return error;
    }
};

export const withdrawFunds = async (
    parent: any,
    args: { symbol: string; address: string; amount: number },
    context: { user: any }
) => {
    try {
        const { id } = context.user;
        const user = await User.findOne({
            where: { identityId: id },
            relations: ["wallet"],
        });
        if (!user) throw new Error("User not found");
        let { symbol, address, amount } = args;
        symbol = symbol.toUpperCase();
        if (!(await TatumClient.isCurrencySupported(symbol))) throw new Error(`currency ${symbol} is not supported`);
        const userCurrency = await Currency.findOne({ where: { wallet: user.wallet, symbol } });
        if (!userCurrency) throw new Error(`No such currency:${symbol} in user wallet`);
        const userAccountBalance = await TatumClient.getAccountBalance(userCurrency.tatumId);
        if (parseFloat(userAccountBalance.availableBalance) < amount)
            throw new Error(`Not enough funds in user account`);
        // const minWithdrawAmount = await getMinWithdrawableAmount(userCurrency.symbol.toLowerCase());
        // if (amount < minWithdrawAmount)
        //     throw new Error(`Unable to process withdraw, min amount required is ${minWithdrawAmount}`);
        let payload: WithdrawDetails = {
            senderAccountId: userCurrency.tatumId,
            paymentId: `${USER_WITHDRAW}:${user.id}`,
            senderNote: RAIINMAKER_WITHDRAW,
            address,
            amount: getWithdrawableAmount(amount),
        };
        await TatumClient.withdrawFundsToBlockchain(symbol, payload);
        const newTransfer = new Transfer();
        newTransfer.currency = symbol;
        newTransfer.amount = new BigNumber(getWithdrawableAmount(amount));
        newTransfer.action = "withdraw";
        newTransfer.ethAddress = address;
        newTransfer.wallet = user.wallet;
        newTransfer.status = "SUCCEEDED";
        newTransfer.save();
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
