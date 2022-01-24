import { RAIINMAKER_WITHDRAW, TatumClient, USER_WITHDRAW } from "../clients/tatumClient";
import { Admin } from "../models/Admin";
import { Request, Response } from "express";
import { TatumWallet } from "../models/TatumWallet";
import { User } from "../models/User";
import { S3Client } from "../clients/s3";
import { asyncHandler, BN } from "../util";
import { Currency } from "../models/Currency";
import { Transfer } from "../models/Transfer";
import { ApolloError } from "apollo-server-express";
import { findOrCreateCurrency } from "../util/tatumHelper";

export const initWallet = asyncHandler(async (req: Request, res: Response) => {
    try {
        let { currency } = req.body;
        currency = currency.toUpperCase();
        const foundWallet = await TatumClient.getWallet(currency);
        if (foundWallet) throw new Error(`Wallet already exists for currency: ${currency}`);
        const wallet: any = await TatumClient.createWallet(currency);
        await S3Client.setTatumWalletKeys(currency, {
            ...wallet,
        });
        await TatumWallet.addTatumWallet({
            xpub: wallet.xpub || "",
            address: wallet.address || "",
            currency,
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
        const foundWallet = await TatumClient.getWallet(currency);
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
        throw new ApolloError(error.message);
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
        let ledgerAccount;
        if (fromTatum) ledgerAccount = await findOrCreateCurrency(symbol, admin.org.wallet);
        return {
            symbol,
            address: ledgerAccount?.depositAddress || process.env.ETHEREUM_DEPOSIT_ADDRESS,
            fromTatum,
            destinationTag: ledgerAccount?.destinationTag || "",
            memo: ledgerAccount?.memo || "",
            message: ledgerAccount?.message || "",
        };
    } catch (error) {
        console.log("ERROR----", error);
        throw new ApolloError(error.message);
    }
};

export const withdrawFunds = async (
    parent: any,
    args: { symbol: string; address: string; amount: number },
    context: { user: any }
) => {
    try {
        const user = await User.findUserByContext(context.user, ["wallet"]);
        if (!user) throw new Error("User not found");
        let { symbol, address, amount } = args;
        symbol = symbol.toUpperCase();
        if (!(await TatumClient.isCurrencySupported(symbol))) throw new Error(`currency ${symbol} is not supported`);
        const userCurrency = await Currency.findOne({ where: { wallet: user.wallet, symbol } });
        if (!userCurrency) throw new Error(`User wallet not found for currency ${symbol}`);
        const userAccountBalance = await TatumClient.getAccountBalance(userCurrency.tatumId);
        if (parseFloat(userAccountBalance.availableBalance) < amount)
            throw new Error(`Not enough funds in user account`);
        const tatumWallet = await TatumClient.getWallet(symbol);
        if (!tatumWallet || !userCurrency) throw new Error("Tatum wallet not found for provided sender account.");
        await TatumClient.withdrawFundsToBlockchain({
            senderAccountId: userCurrency.tatumId,
            paymentId: `${USER_WITHDRAW}:${user.id}`,
            senderNote: RAIINMAKER_WITHDRAW,
            address,
            amount,
            currency: userCurrency,
            wallet: tatumWallet,
        });
        const newTransfer = Transfer.initTatumTransfer({
            symbol,
            amount: new BN(amount),
            action: "WITHDRAW",
            wallet: user.wallet,
            tatumId: address,
        });
        newTransfer.save();
        return {
            success: true,
            message: "Withdraw completed successfully",
        };
    } catch (error) {
        console.log("ERROR----", error);
        throw new ApolloError(error.message);
    }
};
