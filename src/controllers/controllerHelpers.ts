import { CryptoCurrency } from "../models/CryptoCurrency";
import { TatumClient } from "../clients/tatumClient";
import { Currency } from "../models/Currency";
import { getExchangeRateForCrypto } from "../util/exchangeRate";
// eslint-disable-next-line
// @ts-ignore
import getImage from "cryptoicons-cdn";
import { Wallet } from "../models/Wallet";

export const isSupportedCurrency = async (symbol: string): Promise<boolean> => {
    const crypto = await CryptoCurrency.findOne({ where: { type: symbol.toLowerCase() } });
    if (crypto) return true;
    return await TatumClient.isCurrencySupported(symbol);
};

export const findOrCreateCurrency = async (symbol: string, wallet: Wallet): Promise<Currency> => {
    try {
        let ledgerAccount = await Currency.findOne({ where: { wallet, symbol } });
        if (!ledgerAccount) {
            const newLedgerAccount = await TatumClient.createLedgerAccount(symbol);
            const newDepositAddress = await TatumClient.generateDepositAddress(newLedgerAccount.id);
            ledgerAccount = await Currency.addAccount({
                ...newLedgerAccount,
                ...newDepositAddress,
                wallet,
            });
        }
        return ledgerAccount;
    } catch (error) {
        console.log(error);
        throw new Error(error.message);
    }
};

export const getWithdrawableAmount = (amount: number): number => {
    return amount * 0.95;
};

export const getMinWithdrawableAmount = async (symbol: string) => {
    const minLimit = process.env.MIN_WITHDRAW_LIMIT ? parseFloat(process.env.MIN_WITHDRAW_LIMIT) : 250;
    const marketRate = await getExchangeRateForCrypto(symbol);
    return (1 / marketRate) * minLimit;
};

export const getUSDValueForCurrency = async (symbol: string, amount: number) => {
    if (symbol.toLowerCase() === "coiin") {
        return parseFloat(process.env.COIIN_VALUE || "0") * amount;
    }
    const marketRate = await getExchangeRateForCrypto(symbol);
    return marketRate * amount;
};

export const getCryotoAssesImageUrl = (symbol: string): string => {
    return getImage(symbol).toLowerCase().includes("unknown") ? getImage("ETH") : getImage(symbol);
};
