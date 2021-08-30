import { TatumAccount } from "../models/TatumAccount";
import { TatumClient } from "../clients/tatumClient";
import { Admin } from "../models/Admin";

// interface DepositAddressData {
//     address: string;
//     currency: string;
//     derivationKey: number;
//     xpub: string;
//     destinationTag: number;
//     memo: string;
//     message: string;
// }

const depositAddress =
    process.env.NODE_ENV === "production"
        ? "0x9f6fE7cF8CCC66477c9f7049F22FbbE35234274D"
        : "0x275EE6238D103fDBE49d4cF6358575aA914F8654";

export const getDepositAddress = async (parent: any, args: { currency: string }, context: { user: any }) => {
    try {
        const { currency } = args;
        const fromTatum = TatumClient.isCurrencySupported(currency.toUpperCase());
        const { id } = context.user;
        if (fromTatum) {
            let tatumAccount = await findOrCreateLedgeAccount(currency);
            const admin = Admin.findOne({ where: { firebaseId: id }, relations: ["org"] });
            return admin;
        } else {
            return {
                currency: currency,
                address: depositAddress,
                fromTatum,
            };
        }
    } catch (error) {
        return error;
    }
};

const findOrCreateLedgeAccount = async (currency: string) => {
    let tatumAccount = await TatumAccount.findOne({ where: { currency: currency } });
    if (!tatumAccount) {
        tatumAccount = await TatumClient.createLedgerAccount(currency);
        TatumAccount.addAccount(tatumAccount);
    }
    return tatumAccount;
};

// const prepareDespositAddressResponse = (data: any): DepositAddressData => {
//     return {
//         address: data.address,
//         currency: data.currency,
//         derivationKey: data.derivationKey,
//         xpub: data.xpub,
//         destinationTag: data.destinationTag,
//         memo: data.memo,
//         message: data.message,
//     };
// };
