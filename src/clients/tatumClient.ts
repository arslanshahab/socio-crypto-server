import { S3Client } from "./s3";
import { Secrets } from "../util/secrets";
import {
    generateWallet,
    createAccount,
    generateDepositAddress,
    getTransactionsByAccount,
    Currency,
    Fiat,
} from "@tatumio/tatum";

export class TatumClient {
    private static currencies = [
        { currency: "BTC", key: "xpub" },
        { currency: "ETH", key: "xpub" },
        { currency: "XRP", key: "address" },
        { currency: "XLM", key: "address" },
        { currency: "BCH", key: "xpub" },
        { currency: "LTC", key: "xpub" },
        { currency: "FLOW", key: "xpub" },
        { currency: "CELO", key: "address" },
        { currency: "EGLD", key: "address" },
        { currency: "TRON", key: "xpub" },
        { currency: "ADA", key: "xpub" },
        { currency: "QTUM", key: "xpub" },
        { currency: "BNB", key: "address" },
        { currency: "BSC", key: "address" },
        { currency: "DOGE", key: "xpub" },
        { currency: "VET", key: "xpub" },
        { currency: "ONE", key: "xpub" },
        { currency: "NEO", key: "xpub" },
        { currency: "BAT", key: "xpub" },
        { currency: "USDT", key: "xpub" },
        { currency: "WBTC", key: "xpub" },
        { currency: "USDC", key: "xpub" },
        { currency: "TUSD", key: "xpub" },
        { currency: "MKR", key: "xpub" },
        { currency: "LINK", key: "xpub" },
        { currency: "PAX", key: "xpub" },
        { currency: "PAXG", key: "xpub" },
        { currency: "UNI", key: "xpub" },
    ];

    private static async fetchWalletKeys(currency: string) {
        try {
            currency = currency.toUpperCase();
            let walletKeys = await S3Client.getTatumWalletKeys();
            const foundCurrency = this.currencies.find((item) => item.currency === currency);
            if (!foundCurrency) throw new Error("currency not found!");
            if (!walletKeys[foundCurrency.currency]) {
                const newWalletKeys = await this.createWallet(currency);
                walletKeys[currency] = newWalletKeys;
                await S3Client.uploadTatumWalletKeys(walletKeys);
            }
            return walletKeys[foundCurrency.currency];
        } catch (error) {
            if (error.code === "NoSuchKey") {
                let walletKeys: any = {};
                const newWalletKeys = await this.createWallet(currency);
                walletKeys[currency] = newWalletKeys;
                await S3Client.uploadTatumWalletKeys(walletKeys);
                return newWalletKeys;
            } else {
                console.log(error);
                throw new Error(error.message);
            }
        }
    }

    public static getAllCurrencies(): string[] {
        return this.currencies.map((item) => item.currency);
    }

    public static isCurrencySupported(currency: string): Boolean {
        const foundCurrency = this.currencies.find((item) => item.currency === currency.toUpperCase());
        return foundCurrency ? true : false;
    }

    public static async createWallet(currency: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const walletData: any = await generateWallet(currency as Currency, false);
            const currencyData = this.currencies.find((item) => item.currency === currency);
            if (currencyData) {
                walletData.xpub = walletData[currencyData.key];
            }
            return walletData;
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async createLedgerAccount(currency: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const walletData = await this.fetchWalletKeys(currency);
            return await createAccount({
                currency: currency.toUpperCase(),
                accountingCurrency: "USD" as Fiat,
                xpub: walletData.xpub,
            });
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async createNewDepositAddress(accountId: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await generateDepositAddress(accountId);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async getAccountTransactions(accountId: string, destAccount: string, offset: number) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getTransactionsByAccount({
                id: accountId,
                counterAccount: destAccount,
            });
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }
}
