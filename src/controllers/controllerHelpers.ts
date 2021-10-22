import { CryptoCurrency } from "../models/CryptoCurrency";
import { TatumClient } from "../clients/tatumClient";
import { TatumAccount } from "../models/TatumAccount";
import { Org } from "../models/Org";

export const isSupportedCurrency = async (currency: string): Promise<boolean> => {
    const crypto = await CryptoCurrency.findOne({ where: { type: currency.toLowerCase() } });
    if (crypto) return true;
    return await TatumClient.isCurrencySupported(currency);
};

export const findOrCreateLedgerAccount = async (currency: string, org: Org): Promise<TatumAccount> => {
    try {
        let tatumAccount = org.tatumAccounts.find((item) => item.currency === currency);
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
