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
    public static currencies = ["BTC"];

    public static isCurrencySupported(currency: string): Boolean {
        return this.currencies.includes(currency);
    }

    public static async createWallet(currency: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const newWallet = await generateWallet(currency.toUpperCase() as Currency, true);
            await S3Client.uploadTatumWalletData(currency, newWallet);
            return newWallet;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    public static async createLedgerAccount(currency: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            let walletData = await S3Client.getTatumWalletData(currency);
            return await createAccount({
                currency: currency.toUpperCase(),
                accountingCurrency: "USD" as Fiat,
                xpub: walletData.xpub,
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    public static async createNewDepositAddress(accountId: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await generateDepositAddress(accountId);
        } catch (error) {
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
            throw new Error(error.message);
        }
    }
}
