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
import { offchainEstimateFee, performOffchainWithdraw } from "../util/tatumHelper";
import { Currency } from "../models/Currency";
import { RequestData, doFetch } from "../util/fetchRequest";

export const CAMPAIGN_CREATION_AMOUNT = "CAMPAIGN_CREATION_AMOUNT";
export const CAMPAIGN_FEE = "CAMPAIGN_FEE";
export const CAMPAIGN_REWARD = "CAMPAIGN_REWARD";
export const USER_WITHDRAW = "USER_WITHDRAW";
export const USER_WITHDRAW_FEE = "USER_WITHDRAW_FEE";
export const RAIINMAKER_WITHDRAW = "RAIINMAKER_WITHDRAW";

export interface WithdrawPayload {
    senderAccountId: string;
    address: string;
    amount: number;
    paymentId: string;
    senderNote: string;
    fee?: string;
    index?: number;
    currency: Currency;
    wallet: TatumWallet;
}

export interface FeeCalculationParams {
    senderAccountId: string;
    toAddress: string;
    amount: number;
    tatumWallet: TatumWallet;
    currency: Currency;
}

export interface CustodialAddressPayload {
    chain: string;
    fromPrivateKey: string;
    owner: string;
    batchCount: number;
}

export interface WalletKeys {
    xpub?: string;
    privateKey?: string;
    walletAddress?: string;
    secret?: string;
    mnemonic?: string;
}

export const symbolToChain: { [key: string]: string } = {
    BTC: "BTC",
    ETH: "ETH",
    XRP: "XRP",
    XLM: "XLM",
    BCH: "BCH",
    LTC: "LTC",
    FLOW: "FLOW",
    CELO: "CELO",
    EGLD: "EGLD",
    TRON: "TRON",
    ADA: "ADA",
    QTUM: "QTUM",
    BNB: "BNB",
    BSC: "BSC",
    DOGE: "DOGE",
    VET: "VET",
    ONE: "ONE",
    NEO: "NEO",
    BAT: "ETH",
    USDT: "ETH",
    WBTC: "ETH",
    USDC: "ETH",
    TUSD: "ETH",
    MKR: "ETH",
    LINK: "ETH",
    PAX: "ETH",
    PAXG: "ETH",
    UNI: "ETH",
};

export class TatumClient {
    public static baseUrl = "https://api-eu1.tatum.io/v3";

    private static createCustodialAddresses = async (
        data: CustodialAddressPayload
    ): Promise<{ txId: string; failed: boolean }> => {
        const endpoint = `${TatumClient.baseUrl}/blockchain/sc/custodial/batch`;
        const requestData: RequestData = {
            method: "POST",
            url: endpoint,
            payload: data,
            headers: { "x-api-key": Secrets.tatumApiKey },
        };
        return await doFetch(requestData);
    };

    private static getCustodialAddresses = async (data: { txId: string; chain: string }): Promise<string[]> => {
        const endpoint = `${TatumClient.baseUrl}/blockchain/sc/custodial/${data.chain}/${data.txId}`;
        const requestData: RequestData = {
            method: "GET",
            url: endpoint,
            headers: { "x-api-key": Secrets.tatumApiKey },
        };
        return await doFetch(requestData);
    };

    private static getWalletKeys = async (symbol: string): Promise<WalletKeys> => {
        try {
            if (!TatumClient.isCurrencySupported(symbol)) throw new Error(`Currency ${symbol} is not supported`);
            const baseChain = symbolToChain[symbol];
            if (baseChain === "ETH" || baseChain === "BSC") symbol = baseChain;
            return await S3Client.getTatumWalletKeys(symbol);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static getAllCurrencies = (): string[] => {
        try {
            return Object.keys(symbolToChain);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static isCurrencySupported = (symbol: string): boolean => {
        try {
            return Boolean(Object.keys(symbolToChain).includes(symbol.toUpperCase()));
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static getBaseChain = (symbol: string): string => {
        try {
            if (!TatumClient.isCurrencySupported(symbol)) throw new Error(`Currency ${symbol} is not supported`);
            return symbolToChain[symbol.toUpperCase()];
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static getWallet = async (symbol: string) => {
        try {
            if (!TatumClient.isCurrencySupported(symbol)) throw new Error(`Currency ${symbol} is not supported`);
            const baseChain = symbolToChain[symbol];
            if (baseChain === "ETH" || baseChain === "BSC") symbol = baseChain;
            return await TatumWallet.findOne({ where: { currency: symbol, enabled: true } });
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static createWallet = async (currency: string) => {
        try {
            return await generateWallet(currency as TatumCurrency, false);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static createLedgerAccount = async (symbol: string) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const walletData = await TatumClient.getWallet(symbol);
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
    };

    public static generateDepositAddress = async (accountId: string) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await generateDepositAddress(accountId);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static getAccountBalance = async (accountId: string) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getAccountBalance(accountId);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static getBalanceForAccountList = async (accounts: Currency[]) => {
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
    };

    public static transferFunds = async (
        senderAccountId: string,
        recipientAccountId: string,
        amount: string,
        recipientNote: string
    ) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await storeTransaction({ senderAccountId, recipientAccountId, amount, recipientNote });
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static blockAccountBalance = async (accountId: string, amount: string, type: string) => {
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
    };

    public static unblockAccountBalance = async (blockageId: string) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await deleteBlockedAmount(blockageId);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static getBlockedBalanceForAccount = async (accountId: string, pageSize: number, offset: number) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getBlockedAmountsByAccountId(accountId, pageSize, offset);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static getAccountTransactions = async (filter: TransactionFilter, pageSize: number, offset: number) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getTransactionsByAccount(filter, pageSize, offset);
        } catch (error) {
            console.log(error);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static withdrawFundsToBlockchain = async (data: WithdrawPayload) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const walletKeys = await TatumClient.getWalletKeys(data.currency.symbol);
            const body = { ...walletKeys, ...data };
            return await performOffchainWithdraw(body);
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    };

    public static listWithdrawls = async (status: string, currency: string, pageSize = 50, offset = 0) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getWithdrawals(status, currency, pageSize, offset);
        } catch (error) {
            console.log(error);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static calculateWithdrawFee = async (data: FeeCalculationParams) => {
        try {
            return await offchainEstimateFee(data);
        } catch (error) {
            console.log(error);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static generateCustodialAddresses = async (symbol: string): Promise<string[]> => {
        try {
            const chain = TatumClient.getBaseChain(symbol);
            const walletKeys = await TatumClient.getWalletKeys(chain);
            const txResp = await TatumClient.createCustodialAddresses({
                owner: walletKeys?.walletAddress || "",
                batchCount: 100,
                fromPrivateKey: walletKeys?.privateKey || "",
                chain,
            });
            if (txResp.failed) throw new Error("There was an error creating custodial addresses.");
            return await TatumClient.getCustodialAddresses({ chain, txId: txResp.txId });
        } catch (error) {
            console.log(error);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };
}
