import { Secrets } from "../util/secrets";
import {
    generateWallet,
    createAccount,
    generateDepositAddress,
    Currency,
    Fiat,
    getAccountBalance,
    getTransactionsByAccount,
    TransactionFilter,
    offchainStoreWithdrawal,
    getWithdrawals,
    offchainCompleteWithdrawal,
} from "@tatumio/tatum";
import { TatumWallet } from "../models/TatumWallet";
import { generateRandomId } from "../util/helpers";

export class TatumClient {
    public static async getAllCurrencies(): Promise<string[]> {
        try {
            const wallets = await TatumWallet.find({ where: { enabled: true } });
            return wallets.map((item) => item.currency);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async isCurrencySupported(currency: string): Promise<boolean> {
        const foundCurrency = await TatumWallet.findOne({ where: { currency: currency, enabled: true } });
        return Boolean(foundCurrency);
    }

    public static async createWallet(currency: string) {
        try {
            return await generateWallet(currency as Currency, false);
        } catch (error) {
            console.log(error);
            throw new Error(error.data ? error.data.message : error.message);
        }
    }

    public static async createLedgerAccount(currency: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const walletData = await TatumWallet.findOne({ where: { currency: currency, enabled: true } });
            if (walletData) {
                return await createAccount({
                    currency: currency.toUpperCase(),
                    accountingCurrency: "USD" as Fiat,
                    xpub: walletData.xpub || walletData.address,
                });
            } else {
                throw new Error(`No wallet found for currency: ${currency}`);
            }
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async generateDepositAddress(accountId: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await generateDepositAddress(accountId);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async getAccountBalance(accountId: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getAccountBalance(accountId);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async getBalanceForAccountList(accounts: string[]) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const promiseArray: Promise<any>[] = [];
            for (let index = 0; index < accounts.length; index++) {
                promiseArray.push(getAccountBalance(accounts[index]));
            }
            const response = await Promise.all(promiseArray);
            for (let responseIndex = 0; responseIndex < accounts.length; responseIndex++) {
                response[responseIndex]["accountId"] = accounts[responseIndex];
            }
            return response;
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async getAccountTransactions(filter: TransactionFilter, pageSize: number, offset: number) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getTransactionsByAccount(filter, pageSize, offset);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async createWithdrawRequest(accountId: string, address: string, amount: number) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await offchainStoreWithdrawal({
                senderAccountId: accountId,
                address: address,
                amount: amount,
                paymentId: generateRandomId(),
                senderNote: "Withdraw from Raiinmaker",
            });
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async getPendingWithdrawRequests(pageSize: number, offset: number) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getWithdrawals("InProgress", "", pageSize, offset);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async completeWithdraw(id: string, txId: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await offchainCompleteWithdrawal(id, txId);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }
}
