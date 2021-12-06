import { Secrets } from "../util/secrets";
import {
    generateWallet,
    createAccount,
    generateDepositAddress,
    Currency as TatumCurrency,
    Fiat,
    getAccountBalance,
    getTransactionsByAccount,
    TransactionFilter,
    blockAmount,
    deleteBlockedAmount,
    getBlockedAmountsByAccountId,
    storeTransaction,
    getWithdrawals,
} from "@tatumio/tatum";
import { TatumWallet } from "../models/TatumWallet";
import { S3Client } from "./s3";
import { performWithdraw } from "../util/tatumHelper";
import { Currency } from "../models/Currency";

export const CAMPAIGN_CREATION_AMOUNT = "CAMPAIGN-AMOUNT";
export const CAMPAIGN_FEE = "CAMPAIGN-FEE";
export const CAMPAIGN_REWARD = "CAMPAIGN-REWARD";
export const USER_WITHDRAW = "USER-WITHDRAW";
export const RAIINMAKER_WITHDRAW = "RAIINMAKER-WITHDRAW";

export interface WithdrawDetails {
    senderAccountId: string;
    address: string;
    amount: string;
    paymentId: string;
    senderNote: string;
    fee?: string;
}

export class TatumClient {
    public static baseUrl = "https://api-eu1.tatum.io";

    public static async getAllCurrencies(): Promise<string[]> {
        try {
            const wallets = await TatumWallet.find({ where: { enabled: true } });
            return wallets.map((item) => item.currency);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async isCurrencySupported(symbol: string): Promise<boolean> {
        const foundCurrency = await TatumWallet.findOne({ where: { currency: symbol.toUpperCase(), enabled: true } });
        return Boolean(foundCurrency);
    }

    public static async createWallet(currency: string) {
        try {
            return await generateWallet(currency as TatumCurrency, false);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async createLedgerAccount(symbol: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const walletData = await TatumWallet.findOne({ where: { currency: symbol, enabled: true } });
            if (walletData) {
                return await createAccount({
                    currency: symbol.toUpperCase(),
                    accountingCurrency: "USD" as Fiat,
                    xpub: walletData.xpub || walletData.address,
                });
            } else {
                throw new Error(`No wallet found for symbol: ${symbol}`);
            }
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async generateDepositAddress(accountId: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await generateDepositAddress(accountId);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async getAccountBalance(accountId: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getAccountBalance(accountId);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async getBalanceForAccountList(accounts: Currency[]) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const promiseArray: Promise<any>[] = [];
            for (let index = 0; index < accounts.length; index++) {
                promiseArray.push(getAccountBalance(accounts[index].tatumId));
            }
            const response = await Promise.all(promiseArray);
            for (let responseIndex = 0; responseIndex < accounts.length; responseIndex++) {
                response[responseIndex]["tatumId"] = accounts[responseIndex].tatumId;
            }
            return response;
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async transferFunds(
        senderAccountId: string,
        recipientAccountId: string,
        amount: string,
        recipientNote: string
    ) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await storeTransaction({ senderAccountId, recipientAccountId, amount, recipientNote });
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async blockAccountBalance(accountId: string, amount: string, type: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await blockAmount(accountId, {
                amount,
                type,
                description: type,
            });
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async unblockAccountBalance(blockageId: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await deleteBlockedAmount(blockageId);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async getBlockedBalanceForAccount(accountId: string, pageSize: number, offset: number) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getBlockedAmountsByAccountId(accountId, pageSize, offset);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async getAccountTransactions(filter: TransactionFilter, pageSize: number, offset: number) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getTransactionsByAccount(filter, pageSize, offset);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async withdrawFundsToBlockchain(currency: string, data: WithdrawDetails) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const walletKeys = await S3Client.getTatumWalletKeys(currency);
            const body = { ...walletKeys, ...data };
            return await performWithdraw(currency, body);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public static async listWithdrawls(status: string, currency: string, pageSize = 50, offset = 0) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getWithdrawals(status, currency, pageSize, offset);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }
}
