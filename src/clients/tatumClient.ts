import { doFetch, RequestData } from "../util/fetchRequest";
import { S3Client } from "./s3";

export class TatumClient {
    public static baseUrl = "https://api-eu1.tatum.io";
    public static currencies = ["BTC"];

    public static async createLedgerAccount(currency: string) {
        try {
            const token = await S3Client.getTatumAPIKey();
            if (token) {
                const requestData: RequestData = {
                    method: "POST",
                    url: `${this.baseUrl}/v3/ledger/account`,
                    xAPIToken: token,
                    payload: { currency: currency.toUpperCase(), accountingCurrency: "USD" },
                };
                const response = await doFetch(requestData);
                const data = await response.json();
                if (response.status === 200) {
                    return data;
                }
                console.log(data);
                throw new Error("Error creating ledger account");
            }
            throw new Error("Error fetching API Token");
        } catch (error) {
            throw new Error(error.message);
        }
    }

    public static async createNewDepositAddress(accountId: string) {
        try {
            const token = await S3Client.getTatumAPIKey();
            if (token) {
                const requestData: RequestData = {
                    method: "POST",
                    url: `${this.baseUrl}/v3/offchain/account/${accountId}/address?index=2`,
                    xAPIToken: token,
                };
                const response = await doFetch(requestData);
                return await response.json();
            }
            throw new Error("Error fetching API Token");
        } catch (error) {
            throw new Error(error.message);
        }
    }

    public static async getAccountTransactions(accountId: string, destAccount: string, offset: number) {
        try {
            const token = await S3Client.getTatumAPIKey();
            if (token) {
                const requestData: RequestData = {
                    method: "POST",
                    url: `${this.baseUrl}/v3/ledger/transaction/account?pageSize=50&offset=${offset}`,
                    xAPIToken: token,
                    payload: { id: accountId, counterAccount: destAccount },
                };
                const response = await doFetch(requestData);
                return await response.json();
            }
            throw new Error("Error fetching API Token");
        } catch (error) {
            throw new Error(error.message);
        }
    }

    public static isCurrencySupported(currency: string): Boolean {
        return this.currencies.includes(currency);
    }
}
