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
    sendCeloOffchainTransaction,
    sendTronOffchainTransaction,
    offchainCompleteWithdrawal,
    offchainCancelWithdrawal,
    createNewSubscription,
    SubscriptionType,
    getAccountById,
} from "@tatumio/tatum";
import { TatumWallet } from "../models/TatumWallet";
import { S3Client } from "./s3";
import { adjustWithdrawableAmount, getCurrencyForTatum, transferFundsToRaiinmaker } from "../util/tatumHelper";
import { Currency } from "../models/Currency";
import { RequestData, doFetch } from "../util/fetchRequest";
import { Wallet } from "../models/Wallet";
import { CustodialAddress } from "../models/CustodialAddress";
import { formatFloat } from "../util/index";
import { BSC, CUSTODIAL_NETWORKS, ETH } from "../util/constants";
import { Token } from "../models/Token";
import { SymbolNetworkParams } from "../types.d";
import { sleep } from "../controllers/helpers";
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
    custodialAddress?: string;
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

    private static createCustodialAddress = async (
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

    private static prepareTransferFromCustodialWallet = async (
        data: WithdrawPayload & WalletKeys
    ): Promise<{ txId: string }> => {
        const isSubCustodialToken = TatumClient.isSubCustodialToken(data.currency.token);
        const requestData: RequestData = {
            method: "POST",
            url: `${TatumClient.baseUrl}/blockchain/sc/custodial/transfer`,
            payload: {
                chain: data.currency.token.network as TatumCurrency,
                custodialAddress: data?.custodialAddress,
                tokenAddress: data.currency.token.contractAddress,
                contractType: isSubCustodialToken ? 0 : 3,
                recipient: data.address,
                amount: data.amount,
                fromPrivateKey: data.privateKey,
            },
            headers: { "x-api-key": Secrets.tatumApiKey },
        };
        return await doFetch(requestData);
    };

    public static getAllCurrencies = async (): Promise<{ symbol: string; network: string }[]> => {
        try {
            const tokens = await Token.find({ where: { enabled: true } });
            return tokens.map((item) => ({ symbol: item.symbol, network: item.network }));
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static isCurrencySupported = async (data: SymbolNetworkParams): Promise<Token | undefined> => {
        try {
            return await Token.findOne({
                where: { symbol: data.symbol.toUpperCase(), network: data.network.toUpperCase(), enabled: true },
            });
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static isCustodialWallet = (data: SymbolNetworkParams): boolean => {
        try {
            return CUSTODIAL_NETWORKS.includes(data.network);
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static isERC20 = (data: SymbolNetworkParams): boolean => {
        try {
            return data.network === ETH;
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static isBEP20 = (data: SymbolNetworkParams): boolean => {
        try {
            return data.network === BSC;
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static isSubCustodialToken = (data: SymbolNetworkParams): boolean => {
        try {
            return TatumClient.isCustodialWallet(data) && data.symbol !== data.network;
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static ifWalletExists = async (data: SymbolNetworkParams): Promise<boolean> => {
        try {
            let { symbol, network } = data;
            if (!(await TatumClient.isCurrencySupported(data)))
                throw new Error(`Currency ${data.symbol} is not supported.`);
            if (TatumClient.isCustodialWallet(data)) symbol = network;
            return Boolean(await TatumWallet.findOne({ where: { currency: symbol } }));
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static getWallet = async (
        data: SymbolNetworkParams
    ): Promise<WalletKeys & { xpub: string; address: string; currency: string }> => {
        try {
            let { symbol, network } = data;
            if (!(await TatumClient.isCurrencySupported(data)))
                throw new Error(`Currency ${data.symbol} is not supported.`);
            if (TatumClient.isCustodialWallet(data)) symbol = network;
            const keys = await S3Client.getTatumWalletKeys(symbol);
            const walletKeys = { ...keys, walletAddress: keys.address };
            const dbWallet = await TatumWallet.findOne({ where: { currency: symbol } });
            return { ...walletKeys, currency: dbWallet?.currency, xpub: dbWallet?.xpub, address: dbWallet?.address };
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

    public static createLedgerAccount = async (data: { symbol: string; network: string; isCustodial: boolean }) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            let { symbol, isCustodial } = data;
            const wallet = await TatumClient.getWallet({ symbol: data.symbol, network: data.network });
            symbol = getCurrencyForTatum(data);
            return await createAccount({
                currency: symbol,
                ...(!isCustodial && { xpub: wallet?.xpub || wallet?.address }),
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

    public static getAccountDetails = async (accountId: string) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getAccountById(accountId);
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

    public static assignAddressToAccount = async (data: { accountId: string; address: string }) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await assignDepositAddress(data.accountId, data.address);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static createAccountIncomingSubscription = async (data: { accountId: string; url: string }) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            await createNewSubscription({
                type: SubscriptionType.ACCOUNT_INCOMING_BLOCKCHAIN_TRANSACTION,
                attr: { id: data.accountId, url: data.url },
            });
        } catch (error) {
            console.log(error);
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

    public static transferFunds = async (data: {
        senderAccountId: string;
        recipientAccountId: string;
        amount: string;
        recipientNote: string;
    }) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await storeTransaction(data);
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
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static withdrawFundsToBlockchain = async (data: WithdrawPayload) => {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const wallet = await TatumClient.getWallet({
                symbol: data.currency.token.symbol,
                network: data.currency.token.network,
            });
            const payload = { ...wallet, ...data };
            const chain = payload.currency.token.network;
            const { withdrawAbleAmount, fee } = await adjustWithdrawableAmount(payload);
            if (parseFloat(withdrawAbleAmount) <= 0)
                throw new Error("Not enough balance in user account to pay gas fee.");
            const body = {
                ...payload,
                amount: data.amount,
                ...(payload.currency.derivationKey && { index: payload.currency.derivationKey }),
                fee,
            };
            const callWithdrawMethod = async () => {
                switch (chain) {
                    case "BTC":
                        return await sendBitcoinOffchainTransaction(false, body as any);
                    case "XRP":
                        return await sendXrpOffchainTransaction(false, body as any);
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
                        return await TatumClient.sendTokenOffchainTransaction(body);
                    case "ETH":
                        return await TatumClient.sendOffchainTransactionFromCustodial(body);
                    case "BSC":
                        return await TatumClient.sendOffchainTransactionFromCustodial(body);
                    case "MATIC":
                        return await TatumClient.sendOffchainTransactionFromCustodial(body);
                    case "DOGE":
                        return await sendDogecoinOffchainTransaction(false, body as any);
                    default:
                        throw new Error(
                            `Withdraws for ${body.currency.token.symbol} are not supported at this moment.`
                        );
                }
            };
            const withdrawTX = await callWithdrawMethod();
            if (TatumClient.isSubCustodialToken(data.currency.token)) {
                try {
                    await transferFundsToRaiinmaker({
                        currency: payload.currency,
                        amount: (parseFloat(data.amount) - parseFloat(withdrawAbleAmount)).toFixed(2),
                    });
                } catch (error) {
                    console.log(error);
                }
            }
            return withdrawTX;
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
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

    public static estimateLedgerToBlockchainFee = async (data: WithdrawPayload) => {
        try {
            const wallet = await TatumClient.getWallet(data.currency.token);
            const endpoint = `${TatumClient.baseUrl}/offchain/blockchain/estimate`;
            const requestData: RequestData = {
                method: "POST",
                url: endpoint,
                payload: {
                    senderAccountId: data.senderAccountId,
                    address: data.address,
                    amount: data.amount,
                    xpub: wallet?.xpub,
                },
                headers: { "x-api-key": Secrets.tatumApiKey },
            };
            const resp = await doFetch(requestData);
            return parseFloat(formatFloat(resp.fast));
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static estimateCustodialWithdrawFee = async (data: WithdrawPayload) => {
        const endpoint = `${TatumClient.baseUrl}/blockchain/estimate`;
        const isSubCustodialToken = TatumClient.isSubCustodialToken(data.currency.token);
        const wallet = await TatumClient.getWallet(data.currency.token);
        const requestData: RequestData = {
            method: "POST",
            url: endpoint,
            payload: {
                chain: data.currency.token.network,
                type: "TRANSFER_CUSTODIAL",
                amount: formatFloat(data.amount),
                sender: wallet.walletAddress,
                recipient: data.address,
                contractAddress: data.currency.token.contractAddress,
                custodialAddress: data?.custodialAddress,
                tokenType: isSubCustodialToken ? 0 : 3,
            },
            headers: { "x-api-key": Secrets.tatumApiKey },
        };
        const resp = await doFetch(requestData);
        const feeAmount = (resp.gasLimit * resp.gasPrice) / 1e9;
        return parseFloat(formatFloat(feeAmount));
    };

    public static sendTokenOffchainTransaction = async (data: WithdrawPayload & WalletKeys) => {
        try {
            const endpoint = `${TatumClient.baseUrl}/offchain/${data.currency.token.symbol.toLowerCase()}/transfer`;
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

    public static sendOffchainTransactionFromCustodial = async (
        data: WithdrawPayload & WalletKeys
    ): Promise<{ txId: string }> => {
        try {
            const ledgerTX = await offchainStoreWithdrawal({
                senderAccountId: data.currency.tatumId,
                address: data.address,
                amount: data.amount,
                fee: data.fee,
            });
            try {
                const offchainTX = await TatumClient.prepareTransferFromCustodialWallet(data);
                await offchainCompleteWithdrawal(ledgerTX.id, offchainTX.txId);
                return offchainTX;
            } catch (error) {
                await offchainCancelWithdrawal(ledgerTX.id);
                throw new Error("There was an error performing blockchain transaction.");
            }
        } catch (error) {
            console.log(error);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static transferUserDepositedCoiin = async (data: WithdrawPayload) => {
        const wallet = await TatumClient.getWallet({
            symbol: data.currency.token.symbol,
            network: data.currency.token.network,
        });
        const payload = { ...wallet, ...data };
        await TatumClient.prepareTransferFromCustodialWallet(payload);
    };

    public static generateCustodialAddressList = async (data: SymbolNetworkParams, count = 1): Promise<string[]> => {
        try {
            if (!TatumClient.isCustodialWallet(data)) throw new Error("Operation not supported.");
            const wallet = await TatumClient.getWallet(data);
            const txResp = await TatumClient.createCustodialAddress({
                owner: wallet?.walletAddress || "",
                batchCount: count,
                fromPrivateKey: wallet?.privateKey || "",
                chain: data.network,
            });
            if (txResp.failed) throw new Error("There was an error creating custodial addresses.");
            return await TatumClient.getCustodialAddresses({ chain: data.network, txId: txResp.txId });
        } catch (error) {
            console.log(error);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static generateCustodialAddress = async (data: SymbolNetworkParams): Promise<string> => {
        try {
            if (!TatumClient.isCustodialWallet(data)) throw new Error("Operation not supported.");
            const wallet = await TatumClient.getWallet(data);
            const txResp = await TatumClient.createCustodialAddress({
                owner: wallet?.walletAddress || "",
                batchCount: 1,
                fromPrivateKey: wallet?.privateKey || "",
                chain: data.network,
            });
            if (!txResp.txId || txResp.failed) throw new Error("There was an error creating custodial addresses.");
            let addressAvailable = false;
            let address = "";
            while (!addressAvailable) {
                try {
                    const list = await TatumClient.getCustodialAddresses({ chain: data.network, txId: txResp.txId });
                    if (list.length) {
                        address = list[0];
                        addressAvailable = true;
                    }
                } catch (error) {
                    sleep(1000);
                }
            }
            return address;
        } catch (error) {
            console.log(error);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };

    public static findOrCreateCurrency = async (data: SymbolNetworkParams & { wallet: Wallet }): Promise<Currency> => {
        try {
            const token = await TatumClient.isCurrencySupported(data);
            if (!token) throw new Error(`Currency ${data.symbol} is not supported.`);
            const foundWallet = await Wallet.findOne({ where: { id: data.wallet.id }, relations: ["user", "org"] });
            const isCustodial = TatumClient.isCustodialWallet(data);
            let ledgerAccount = await Currency.findOne({ where: { wallet: data.wallet, token } });
            let newDepositAddress;
            if (!ledgerAccount) {
                const newLedgerAccount = await TatumClient.createLedgerAccount({ ...data, isCustodial });
                if (isCustodial) {
                    if (foundWallet?.org) {
                        const availableAddress = await CustodialAddress.getAvailableAddress(data);
                        if (!availableAddress) throw new Error("No custodial address available.");
                        await TatumClient.assignAddressToAccount({
                            accountId: newLedgerAccount.id,
                            address: availableAddress.address,
                        });
                        newDepositAddress = availableAddress;
                    }
                } else {
                    newDepositAddress = await TatumClient.generateDepositAddress(newLedgerAccount.id);
                }
                ledgerAccount = await Currency.addAccount({
                    ...newLedgerAccount,
                    token,
                    symbol: getCurrencyForTatum(data),
                    ...(newDepositAddress && { address: newDepositAddress.address }),
                    wallet: data.wallet,
                });
            }
            return ledgerAccount;
        } catch (error) {
            console.log(error);
            throw new Error(error?.response?.data?.message || error.message);
        }
    };
}
