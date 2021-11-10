import { CryptoCurrency } from "../models/CryptoCurrency";
import { TatumClient } from "../clients/tatumClient";
import { TatumAccount } from "../models/TatumAccount";
import { Org } from "../models/Org";
import { User } from "../models/User";
import { getExchangeRateForCrypto } from "../util/exchangeRate";

export const isSupportedCurrency = async (currency: string): Promise<boolean> => {
    const crypto = await CryptoCurrency.findOne({ where: { type: currency.toLowerCase() } });
    if (crypto) return true;
    return await TatumClient.isCurrencySupported(currency);
};

export const findOrCreateLedgerAccount = async (currency: string, model: any): Promise<TatumAccount> => {
    try {
        if (!(model instanceof User) && !(model instanceof Org)) throw new Error("provided arguments are not correct");
        let tatumAccount = await TatumAccount.findOne({
            where: {
                ...(model instanceof User && { user: model }),
                ...(model instanceof Org && { org: model }),
                currency: currency,
            },
        });
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
    } catch (error) {
        console.log(error);
        throw new Error(error.message);
    }
};

export const getWithdrawableAmount = (amount: number): number => {
    return amount * 0.95;
};

export const getMinWithdrawableAmount = async (currency: string) => {
    const minLimit = process.env.MIN_WITHDRAW_LIMIT ? parseFloat(process.env.MIN_WITHDRAW_LIMIT) : 250;
    const marketRate = await getExchangeRateForCrypto(currency);
    return (1 / marketRate) * minLimit;
};
