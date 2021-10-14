import { TatumAccount } from "../models/TatumAccount";
import { TatumClient } from "../clients/tatumClient";
import { Admin } from "../models/Admin";
import { asyncHandler } from "../util/helpers";
import { Request, Response } from "express";
import { TatumWallet } from "../models/TatumWallet";
import { Secrets } from "../util/secrets";
import { TransactionType } from "@tatumio/tatum";
import { User } from "../models/User";

export const initWallet = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { currency } = req.body;
        const wallet = await TatumClient.createWallet(currency);
        res.status(200).json(wallet);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

export const saveWallet = asyncHandler(async (req: Request, res: Response) => {
    try {
        let { xpub, address, enabled, currency, token } = req.body;
        currency = currency.toUpperCase();
        const foundWallet = await TatumWallet.findOne({ where: { currency: currency } });
        if (foundWallet) throw new Error(`Wallet already exists for currency: ${currency}`);
        if (!token || token !== Secrets.raiinmakerApiToken) throw new Error("Invalid Token");
        const wallet = await TatumWallet.addTatumWallet({ xpub, address, enabled, currency });
        res.status(200).json(wallet);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
    try {
        let { currency, from, token, pageSize, offset } = req.body;
        if (!token || token !== Secrets.raiinmakerApiToken) throw new Error("Invalid Token");
        const tatumAccount = await TatumAccount.findOne({ where: { currency: currency } });
        if (!tatumAccount) throw new Error(`No account found for currency: ${currency}`);
        const transactions = await TatumClient.getAccountTransactions(
            {
                id: tatumAccount.accountId,
                transactionType: TransactionType.CREDIT_DEPOSIT,
                ...(from && { from: from }),
            },
            pageSize || 50,
            offset || 0
        );
        res.status(200).json(transactions);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

export const getSupportedCurrencies = async (parent: any, args: any, context: { user: any }) => {
    try {
        const { id } = context.user;
        const admin = await Admin.findOne({ where: { firebaseId: id } });
        console.log(admin);
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
        let { currency } = args;
        const { id } = context.user;
        if (!currency) throw new Error("Currency not supported");
        currency = currency.toUpperCase();
        const fromTatum = await TatumClient.isCurrencySupported(currency);
        const admin = await Admin.findOne({ where: { firebaseId: id }, relations: ["org", "org.depositAddress"] });
        if (!admin) throw new Error("Admi not found!");
        console.log(`currency--- ${currency}, fromTatum---- ${fromTatum}`);
        let address: string | undefined = "";
        if (fromTatum) {
            let depositAddress = admin.org.depositAddress.find((item) => item.currency === currency);
            if (!depositAddress) {
                let tatumAccount = await findOrCreateLedgerAccount(currency);
                const newDepositAddress = await TatumClient.generateDepositAddress(tatumAccount.accountId);
                depositAddress = await admin.org.updateOrCreateDepositAddress(newDepositAddress);
            }
            address = depositAddress?.address;
        } else {
            address = process.env.ETHEREUM_DEPOSIT_ADDRESS;
        }
        return {
            currency: currency,
            address,
            fromTatum,
        };
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
        let { currency, address, amount } = args;
        currency = currency.toUpperCase();
        const user = await User.findOne({
            where: { identityId: id },
            relations: ["wallet", "wallet.currency"],
        });
        if (!user) throw new Error("User not found");
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

const findOrCreateLedgerAccount = async (currency: string): Promise<TatumAccount> => {
    try {
        currency = currency;
        let tatumAccount = await TatumAccount.findOne({ where: { currency: currency } });
        if (!tatumAccount) {
            const newTatumAccount = await TatumClient.createLedgerAccount(currency);
            tatumAccount = await TatumAccount.addAccount(newTatumAccount);
        }
        return tatumAccount;
    } catch (error) {
        throw new Error(error.message);
    }
};
