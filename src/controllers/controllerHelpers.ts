import { CryptoCurrency } from "../models/CryptoCurrency";
import { TatumClient } from "../clients/tatumClient";
import { TatumAccount } from "../models/TatumAccount";
import { Org } from "../models/Org";
import { User } from "../models/User";

export const isSupportedCurrency = async (currency: string): Promise<boolean> => {
    const crypto = await CryptoCurrency.findOne({ where: { type: currency.toLowerCase() } });
    if (crypto) return true;
    return await TatumClient.isCurrencySupported(currency);
};

export const findOrCreateLedgerAccount = async (currency: string, model: any): Promise<TatumAccount> => {
    try {
        if (model.tatumAccounts) {
            let tatumAccount = model.tatumAccounts.find((item: TatumAccount) => item.currency === currency);
            if (!tatumAccount) {
                const newTatumAccount = await TatumClient.createLedgerAccount(currency);
                const newDepositAddress = await TatumClient.generateDepositAddress(newTatumAccount.id);
                tatumAccount = await TatumAccount.addAccount({
                    ...newTatumAccount,
                    ...newDepositAddress,
                    ...(model instanceof User && { user: model }),
                    ...(model instanceof Org && { org: model }),
                });
            }
            return tatumAccount;
        }
        throw new Error("No accounts associated with this model");
    } catch (error) {
        console.log(error);
        throw new Error(error.message);
    }
};
