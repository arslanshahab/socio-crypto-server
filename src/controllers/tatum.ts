import { TatumAccount } from "../models/TatumAccount";
import { TatumClient } from "../clients/tatumClient";
import { Admin } from "../models/Admin";
// import { asyncHandler } from "../util/helpers";
// import { Request, Response } from "express";
import { DepositAddress } from "../models/DepositAddress";

// export const initWallet = asyncHandler(async (req: Request, res: Response) => {
//     try {
//         const { currency } = req.body;
//         const wallet = await TatumClient.createWallet(currency);
//         res.status(200).json(wallet);
//     } catch (error) {
//         res.status(403).json(error.message);
//     }
// });

export const getDepositAddress = async (parent: any, args: { currency: string }, context: { user: any }) => {
    try {
        const { currency } = args;
        const { id } = context.user;
        const admin = await Admin.findOne({ where: { firebaseId: id }, relations: ["depositAddress"] });
        if (!admin) throw new Error("Admi not found!");
        const fromTatum = TatumClient.isCurrencySupported(currency.toUpperCase());
        let address: string | undefined = "";
        if (fromTatum) {
            let depositAddress = admin.depositAddress.find(
                (item) => item.currency.toLowerCase() === currency.toLowerCase()
            );
            if (!depositAddress) {
                let tatumAccount = await findOrCreateLedgerAccount(currency);
                const newDepositAddress = await TatumClient.createNewDepositAddress(tatumAccount.accountId);
                depositAddress = await DepositAddress.addNewAddress(newDepositAddress, admin);
            }
            address = depositAddress.address;
        } else {
            address = process.env.ETHEREUM_DEPOSIT_ADDRESS;
        }
        console.log(address);
        return {
            currency: currency.toUpperCase(),
            address: address,
            fromTatum,
        };
    } catch (error) {
        console.log(error);
        return error;
    }
};

const findOrCreateLedgerAccount = async (currency: string): Promise<TatumAccount> => {
    try {
        let tatumAccount = await TatumAccount.findOne({ where: { currency: currency.toUpperCase() } });
        if (!tatumAccount?.accountId) {
            const newTatumAccount = await TatumClient.createLedgerAccount(currency);
            tatumAccount = await TatumAccount.addAccount(newTatumAccount);
        }
        return tatumAccount;
    } catch (error) {
        throw new Error(error.message);
    }
};
