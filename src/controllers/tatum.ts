import { TatumAccount } from "../models/TatumAccount";
import { TatumClient } from "../clients/tatumClient";
import { Admin } from "../models/Admin";
import { asyncHandler } from "../util/helpers";
import { Request, Response } from "express";
import { TatumWallet } from "../models/TatumWallet";
import { User } from "../models/User";
import { Org } from "../models/Org";
import { S3Client } from "../clients/s3";

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
        const admin = await Admin.findOne({ where: { firebaseId: id }, relations: ["org", "org.tatumAccount"] });
        if (!admin) throw new Error("Admi not found!");
        let { currency } = args;
        currency = currency.toUpperCase();
        if (!currency) throw new Error("Currency not supported");
        const fromTatum = await TatumClient.isCurrencySupported(currency);
        console.log(`currency--- ${currency}, fromTatum---- ${fromTatum}`);
        let address: string | undefined = "";
        if (fromTatum) {
            const tatumAccount = await findOrCreateLedgerAccount(currency, admin.org);
            address = tatumAccount?.address || "";
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

const findOrCreateLedgerAccount = async (currency: string, org: Org): Promise<TatumAccount> => {
    try {
        let tatumAccount = org.tatumAccount.find((item) => item.currency === currency);
        if (!tatumAccount) {
            const newTatumAccount = await TatumClient.createLedgerAccount(currency);
            const newDepositAddress = await TatumClient.generateDepositAddress(newTatumAccount.id);
            tatumAccount = await TatumAccount.addAccount({
                ...newTatumAccount,
                ...newDepositAddress,
                org: org,
            });
        }
        return tatumAccount;
    } catch (error) {
        throw new Error(error.message);
    }
};
