import { Secrets } from "../util/secrets";
import {
    generateWallet,
    createAccount,
    generateDepositAddress,
    Currency as TatumCurrency,
    getAccountBalance,
    getTransactionsByAccount,
    TransactionFilter,
    blockAmount,
    deleteBlockedAmount,
    getBlockedAmountsByAccountId,
    storeTransaction,
    getWithdrawals,
    assignDepositAddress,
    offchainStoreWithdrawal,
    sendBitcoinOffchainTransaction,
    sendLitecoinOffchainTransaction,
    sendBitcoinCashOffchainTransaction,
    sendAdaOffchainTransaction,
    sendDogecoinOffchainTransaction,
    sendXrpOffchainTransaction,
    sendXlmOffchainTransaction,
    sendCeloOffchainTransaction,
    sendTronOffchainTransaction,
    offchainCompleteWithdrawal,
    offchainCancelWithdrawal,
} from "@tatumio/tatum";
import { TatumWallet } from "../models/TatumWallet";
import { S3Client } from "./s3";
import {
    adjustWithdrawableAmount,
    fixDecimalsForTatum,
    SYMBOL_TO_CHAIN,
    SYMBOL_TO_CONTRACT,
    transferFundsToRaiinmaker,
} from "../util/tatumHelper";
import { Currency } from "../models/Currency";
import { RequestData, doFetch } from "../util/fetchRequest";
import { sleep } from "../controllers/helpers";
import { Wallet } from "../models/Wallet";
import { CustodialAddress } from "../models/CustodialAddress";

export const CAMPAIGN_CREATION_AMOUNT = "CAMPAIGN_CREATION_AMOUNT";
export const CAMPAIGN_FEE = "CAMPAIGN_FEE";
export const CAMPAIGN_REWARD = "CAMPAIGN_REWARD";
export const USER_WITHDRAW = "USER_WITHDRAW";
export const USER_WITHDRAW_FEE = "USER_WITHDRAW_FEE";
export const RAIINMAKER_WITHDRAW = "RAIINMAKER_WITHDRAW";

export interface WithdrawPayload {
    senderAccountId: string;
    address: string;
    amount: string;
    paymentId: string;
    senderNote: string;
    fee?: string;
    index?: number;
    currency: Currency;
    custodialAddress: CustodialAddress;
}

export interface FeeCalculationParams {
    senderAccountId: string;
    toAddress: string;
    amount: number;
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
            if (TatumClient.isCustodialWallet(symbol)) symbol = TatumClient.getBaseChain(symbol);
            const keys = await S3Client.getTatumWalletKeys(symbol);
            return { ...keys, walletAddress: keys.address };
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    private static prepareTransferFromCustodialWallet = async (data: WithdrawPayload & WalletKeys): Promise<string> => {
        const endpoint = `${TatumClient.baseUrl}/blockchain/sc/custodial/transfer`;
        const requestData: RequestData = {
            method: "POST",
            url: endpoint,
            payload: {
                chain: TatumClient.getBaseChain(data.currency.symbol) as TatumCurrency,
                custodialAddress: data.custodialAddress.address,
                tokenAddress: TatumClient.getContractAddress(data.currency.symbol),
                contractType: 0,
                recipient: data.address,
                amount: data.amount,
                fromPrivateKey: data.privateKey,
            },
            headers: { "x-api-key": Secrets.tatumApiKey },
        };
        return await doFetch(requestData);
    };

    public static getAllCurrencies = (): string[] => {
        try {
            return Object.keys(SYMBOL_TO_CHAIN);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static isCurrencySupported = (symbol: string): boolean => {
        try {
            return Boolean(Object.keys(SYMBOL_TO_CHAIN).includes(symbol.toUpperCase()));
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static isCustodialWallet = (symbol: string): boolean => {
        try {
            const chain = TatumClient.getBaseChain(symbol);
            return chain === "ETH" || chain === "BSC";
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static getBaseChain = (symbol: string): string => {
        try {
            return SYMBOL_TO_CHAIN[symbol];
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static getContractAddress = (symbol: string): string => {
        try {
            return SYMBOL_TO_CONTRACT[symbol];
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static getWallet = async (symbol: string) => {
        try {
            if (TatumClient.isCustodialWallet(symbol)) symbol = TatumClient.getBaseChain(symbol);
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

    public static createLedgerAccount = async (currency: string, isCustodial: boolean) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const walletData = await TatumClient.getWallet(currency);
            return await createAccount({
                currency,
                ...(!isCustodial && { xpub: walletData?.xpub || walletData?.address }),
            });
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
            const payload = { ...walletKeys, ...data };
            const chain = TatumClient.getBaseChain(payload.currency.symbol);
            const { withdrawAbleAmount, fee } = await adjustWithdrawableAmount({
                senderAccountId: payload.currency.tatumId,
                toAddress: payload.address,
                amount: parseFloat(payload.amount),
                currency: payload.currency,
            });
            const body = {
                ...payload,
                amount: withdrawAbleAmount,
                ...(payload.currency.derivationKey && { index: payload.currency.derivationKey }),
                ...(chain !== "ETH" && chain !== "BSC" && { fee }),
            };
            const callWithdrawMethod = async () => {
                switch (chain) {
                    case "BTC":
                        return await sendBitcoinOffchainTransaction(false, body as any);
                    case "ETH":
                        return await TatumClient.sendOffchainTransactionFromCustodial(body);
                    case "XRP":
                        return await sendXrpOffchainTransaction(false, body as any);
                    case "XLM":
                        return await sendXlmOffchainTransaction(false, body as any);
                    case "BCH":
                        return await sendBitcoinCashOffchainTransaction(false, body as any);
                    case "LTC":
                        return await sendLitecoinOffchainTransaction(false, body as any);
                    case "FLOW":
                        return await TatumClient.sendTokenOffchainTransaction(payload);
                    case "CELO":
                        return await sendCeloOffchainTransaction(false, body as any);
                    case "TRON":
                        return await sendTronOffchainTransaction(false, body as any);
                    case "ADA":
                        return await sendAdaOffchainTransaction(false, body as any);
                    case "BNB":
                        return await TatumClient.sendTokenOffchainTransaction(payload);
                    case "BSC":
                        return await TatumClient.sendOffchainTransactionFromCustodial(body);
                    case "DOGE":
                        return await sendDogecoinOffchainTransaction(false, body as any);
                    default:
                        throw new Error(`Withdraws for ${body.currency.symbol} are not supported at this moment.`);
                }
            };
            await callWithdrawMethod();
            await transferFundsToRaiinmaker({
                currency: payload.currency,
                amount: String(parseFloat(payload.amount) - parseFloat(withdrawAbleAmount)),
            });
            return true;
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
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static estimateLedgerToBlockchainFee = async (data: FeeCalculationParams) => {
        try {
            const wallet = await TatumClient.getWallet(data.currency.symbol);
            const endpoint = `${TatumClient.baseUrl}/offchain/blockchain/estimate`;
            const requestData: RequestData = {
                method: "POST",
                url: endpoint,
                payload: {
                    senderAccountId: data.senderAccountId,
                    address: data.toAddress,
                    amount: String(data.amount),
                    xpub: wallet?.xpub,
                },
                headers: { "x-api-key": Secrets.tatumApiKey },
            };
            const resp = await doFetch(requestData);
            return parseFloat(fixDecimalsForTatum(resp.fast));
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static estimateETHWithdrawFee = async (data: FeeCalculationParams) => {
        const endpoint = `${TatumClient.baseUrl}/ethereum/gas`;
        const chain = TatumClient.getBaseChain(data.currency.symbol);
        const isERC20 = chain === "ETH" && data.currency.symbol !== chain;
        const requestData: RequestData = {
            method: "POST",
            url: endpoint,
            payload: {
                amount: fixDecimalsForTatum(data.amount),
                from: data.currency.depositAddress,
                to: data.toAddress,
                ...(isERC20 && { contractAddress: TatumClient.getContractAddress(data.currency.symbol) }),
            },
            headers: { "x-api-key": Secrets.tatumApiKey },
        };
        const resp = await doFetch(requestData);
        const feeAmount = (resp.gasLimit * resp.gasPrice) / 1e18;
        return parseFloat(fixDecimalsForTatum(feeAmount));
    };

    public static estimateBSCWithdrawFee = async (data: FeeCalculationParams) => {
        const endpoint = `${TatumClient.baseUrl}/bsc/gas`;
        const chain = TatumClient.getBaseChain(data.currency.symbol);
        const isBEP20 = chain === "BSC" && data.currency.symbol !== chain;
        const requestData: RequestData = {
            method: "POST",
            url: endpoint,
            payload: {
                amount: fixDecimalsForTatum(data.amount),
                from: data.currency.depositAddress,
                to: data.toAddress,
                ...(isBEP20 && { contractAddress: TatumClient.getContractAddress(data.currency.symbol) }),
            },
            headers: { "x-api-key": Secrets.tatumApiKey },
        };
        const resp = await doFetch(requestData);
        const feeAmount = (resp.gasLimit * resp.gasPrice) / 1e18;
        return parseFloat(fixDecimalsForTatum(feeAmount));
    };

    public static sendTokenOffchainTransaction = async (data: WithdrawPayload & WalletKeys) => {
        try {
            const endpoint = `${TatumClient.baseUrl}/offchain/${data.currency.symbol.toLowerCase()}/transfer`;
            const requestData: RequestData = {
                method: "POST",
                url: endpoint,
                payload: data,
                headers: { "x-api-key": Secrets.tatumApiKey },
            };
            return await doFetch(requestData);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static sendOffchainTransactionFromCustodial = async (data: WithdrawPayload & WalletKeys) => {
        try {
            const ledgerTX = await offchainStoreWithdrawal({
                senderAccountId: data.currency.tatumId,
                address: data.address,
                amount: data.amount,
            });
            console.log("ledger tx response ---- ", ledgerTX);
            try {
                const offchainTX = await TatumClient.prepareTransferFromCustodialWallet(data);
                console.log("custodial tx response ----- ", offchainTX);
                return await offchainCompleteWithdrawal(ledgerTX.id, offchainTX);
            } catch (error) {
                await offchainCancelWithdrawal(ledgerTX.id);
                throw new Error("There was an error performing blockchain transaction.");
            }
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static generateCustodialAddresses = async (symbol: string): Promise<string[]> => {
        try {
            const chain = TatumClient.getBaseChain(symbol);
            const walletKeys = await TatumClient.getWalletKeys(chain);
            const txResp = await TatumClient.createCustodialAddresses({
                owner: walletKeys?.walletAddress || "",
                batchCount: 1,
                fromPrivateKey: walletKeys?.privateKey || "",
                chain,
            });
            console.log(txResp);
            if (txResp.failed) throw new Error("There was an error creating custodial addresses.");
            await sleep(20000);
            return await TatumClient.getCustodialAddresses({ chain, txId: txResp.txId });
        } catch (error) {
            console.log(error);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static findOrCreateCurrency = async (symbol: string, wallet: Wallet): Promise<Currency> => {
        try {
            if (!TatumClient.isCurrencySupported(symbol)) throw new Error(`Currency ${symbol} is not supported`);
            const foundWallet = await Wallet.findOne({ where: { id: wallet.id }, relations: ["user", "org"] });
            const chain = TatumClient.getBaseChain(symbol);
            const isCustodial = TatumClient.isCustodialWallet(symbol);
            let ledgerAccount = await Currency.findOne({ where: { wallet, symbol } });
            let newDepositAddress;
            if (!ledgerAccount) {
                const newLedgerAccount = await TatumClient.createLedgerAccount(symbol, isCustodial);
                if (isCustodial) {
                    if (foundWallet?.org) {
                        const availableAddress = await CustodialAddress.getAvailableAddress(chain, wallet);
                        if (!availableAddress) throw new Error("No custodial address available.");
                        await assignDepositAddress(newLedgerAccount.id, availableAddress.address);
                        newDepositAddress = availableAddress;
                        await availableAddress.changeAvailability(false);
                        await availableAddress.assignWallet(wallet);
                    }
                } else {
                    newDepositAddress = await TatumClient.generateDepositAddress(newLedgerAccount.id);
                }
                ledgerAccount = await Currency.addAccount({
                    ...newLedgerAccount,
                    ...(newDepositAddress && { address: newDepositAddress.address }),
                    wallet,
                });
            }
            return ledgerAccount;
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };
}
