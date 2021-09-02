import { TatumAccount } from "../models/TatumAccount";
import { TatumClient } from "../clients/tatumClient";
import { Admin } from "../models/Admin";
// import { asyncHandler } from "../util/helpers";
// import { Request, Response } from "express";
import { DepositAddress } from "../models/DepositAddress";

const ethAddress =
    process.env.NODE_ENV === "production"
        ? "0x9f6fE7cF8CCC66477c9f7049F22FbbE35234274D"
        : "0x275EE6238D103fDBE49d4cF6358575aA914F8654";

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
        if (fromTatum) {
            let depositAddress = admin.depositAddress.find(
                (item) => item.currency.toLowerCase() === currency.toLowerCase()
            );
            if (!depositAddress) {
                let tatumAccount = await findOrCreateLedgeAccount(currency);
                const newDepositAddress = await TatumClient.createNewDepositAddress(tatumAccount.accountId);
                depositAddress = await DepositAddress.addNewAddress(newDepositAddress, admin);
            }
            return {
                currency: currency.toUpperCase(),
                address: depositAddress.address,
                fromTatum,
            };
        } else {
            return {
                currency: currency.toUpperCase(),
                address: ethAddress,
                fromTatum,
            };
        }
    } catch (error) {
        console.log(error);
        return error;
    }
};

const findOrCreateLedgeAccount = async (currency: string): Promise<TatumAccount> => {
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
