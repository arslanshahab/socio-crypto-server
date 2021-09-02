import { S3Client } from "./s3";
import { generateWallet, createAccount, generateDepositAddress, Currency, Fiat } from "@tatumio/tatum";

export class TatumClient {
    public static currencies = ["BTC"];

    public static isCurrencySupported(currency: string): Boolean {
        return this.currencies.includes(currency);
    }

    public static async createWallet(currency: string) {
        try {
            const token = await S3Client.getTatumAPIKey();
            process.env["TATUM_API_KEY"] = token as string;
            const newWallet = await generateWallet(currency.toUpperCase() as Currency, true);
            await S3Client.uploadTatumWalletData(currency, newWallet);
            return newWallet;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    public static async createLedgerAccount(currency: string) {
        try {
            const token = await S3Client.getTatumAPIKey();
            process.env["TATUM_API_KEY"] = token as string;
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
            const token = await S3Client.getTatumAPIKey();
            process.env["TATUM_API_KEY"] = token as string;
            return await generateDepositAddress(accountId);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // public static async getAccountTransactions(accountId: string, destAccount: string, offset: number) {
    //     try {
    //         const token = await S3Client.getTatumAPIKey();
    //         if (token) {
    //             const requestData: RequestData = {
    //                 method: "POST",
    //                 url: `${this.baseUrl}/v3/ledger/transaction/account?pageSize=50&offset=${offset}`,
    //                 xAPIToken: token,
    //                 payload: { id: accountId, counterAccount: destAccount },
    //             };
    //             const response = await doFetch(requestData);
    //             return await response.json();
    //         }
    //         throw new Error("Error fetching API Token");
    //     } catch (error) {
    //         throw new Error(error.message);
    //     }
    // }
}
