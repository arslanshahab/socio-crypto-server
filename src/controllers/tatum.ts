import { TatumAccount } from "../models/TatumAccount";
import { TatumClient } from "../clients/tatumClient";
import { Admin } from "../models/Admin";
import { asyncHandler } from "../util/helpers";
import { Request, Response } from "express";
import { DepositAddress } from "../models/DepositAddress";

export const initWallet = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { currency } = req.body;
        const wallet = await TatumClient.createWallet(currency);
        res.status(200).json(wallet);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

export const getSupportedCurrencies = async (parent: any, args: any, context: { user: any }) => {
    try {
        const { id } = context.user;
        const admin = await Admin.findOne({ where: { firebaseId: id } });
        if (!admin) throw new Error("Admi not found!");
        const supportedCurrencies = [...TatumClient.getAllCurrencies()];
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
        if (!currency) throw new Error("Currency not supported");
        currency = currency.toUpperCase();
        const fromTatum = TatumClient.isCurrencySupported(currency);
        const { id } = context.user;
        const admin = await Admin.findOne({ where: { firebaseId: id }, relations: ["org", "org.depositAddress"] });
        if (!admin) throw new Error("Admi not found!");
        let address: string | undefined = "";
        if (fromTatum) {
            let depositAddress = admin.org.depositAddress.find((item) => item.currency === currency);
            if (!depositAddress) {
                let tatumAccount = await findOrCreateLedgerAccount(currency);
                const newDepositAddress = await TatumClient.createNewDepositAddress(tatumAccount.accountId);
                depositAddress = await DepositAddress.addNewAddress(newDepositAddress, admin.org);
            }
            address = depositAddress.address;
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
