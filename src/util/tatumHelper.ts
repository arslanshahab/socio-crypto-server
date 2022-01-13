import {
    sendBitcoinOffchainTransaction,
    sendEthOffchainTransaction,
    sendLitecoinOffchainTransaction,
    sendBitcoinCashOffchainTransaction,
    sendAdaOffchainTransaction,
    sendDogecoinOffchainTransaction,
    sendXrpOffchainTransaction,
    sendXlmOffchainTransaction,
    sendBscOffchainTransaction,
    sendCeloOffchainTransaction,
    sendEgldOffchainTransaction,
    sendTronOffchainTransaction,
} from "@tatumio/tatum";
import { doFetch, RequestData } from "./fetchRequest";
import { Secrets } from "./secrets";
import { TatumClient, FeeCalculationParams } from "../clients/tatumClient";

// const symbolToChain: { [key: string]: string } = {
//     BTC: "BTC",
//     ETH: "ETH",
//     XRP: "XRP",
//     XLM: "XLM",
//     BCH: "BCH",
//     LTC: "LTC",
//     FLOW: "FLOW",
//     CELO: "CELO",
//     EGLD: "EGLD",
//     TRON: "TRON",
//     ADA: "ADA",
//     QTUM: "QTUM",
//     BNB: "BNB",
//     BSC: "BSC",
//     DOGE: "DOGE",
//     VET: "VET",
//     ONE: "ONE",
//     NEO: "NEO",
//     BAT: "ETH",
//     USDT: "ETH",
//     WBTC: "ETH",
//     USDC: "ETH",
//     TUSD: "ETH",
//     MKR: "ETH",
//     LINK: "ETH",
//     PAX: "ETH",
//     PAXG: "ETH",
//     UNI: "ETH",
// };

export const performWithdraw = async (currency: string, body: any) => {
    const wihtdrawCallback: { [key: string]: any } = {
        BTC: await sendBitcoinOffchainTransaction(false, body),
        ETH: await sendEthOffchainTransaction(false, body),
        XRP: await sendXrpOffchainTransaction(false, body),
        XLM: await sendXlmOffchainTransaction(false, body),
        BCH: await sendBitcoinCashOffchainTransaction(false, body),
        LTC: await sendLitecoinOffchainTransaction(false, body),
        FLOW: await sendTokenOffchainTransaction(currency, body),
        CELO: await sendCeloOffchainTransaction(false, body),
        EGLD: await sendEgldOffchainTransaction(false, body),
        TRON: await sendTronOffchainTransaction(false, body),
        ADA: await sendAdaOffchainTransaction(false, body),
        QTUM: await sendTokenOffchainTransaction(currency, body),
        BNB: await sendTokenOffchainTransaction(currency, body),
        BSC: await sendBscOffchainTransaction(false, body),
        DOGE: await sendDogecoinOffchainTransaction(false, body),
        VET: await sendTokenOffchainTransaction(currency, body),
        ONE: await sendTokenOffchainTransaction(currency, body),
        NEO: await sendTokenOffchainTransaction(currency, body),
        BAT: await sendEthOffchainTransaction(false, body),
        USDT: await sendEthOffchainTransaction(false, body),
        WBTC: await sendEthOffchainTransaction(false, body),
        USDC: await sendEthOffchainTransaction(false, body),
        TUSD: await sendEthOffchainTransaction(false, body),
        MKR: await sendEthOffchainTransaction(false, body),
        LINK: await sendEthOffchainTransaction(false, body),
        PAX: await sendEthOffchainTransaction(false, body),
        PAXG: await sendEthOffchainTransaction(false, body),
        UNI: await sendEthOffchainTransaction(false, body),
    };
    if (!Object.keys(wihtdrawCallback).find((item) => item === currency))
        throw new Error(`Withdraws for ${currency} are not supported at this moment.`);
    return await wihtdrawCallback[currency.toUpperCase()];
};

const sendTokenOffchainTransaction = async (currency: string, data: any) => {
    const endpoint = `${TatumClient.baseUrl}/offchain/${currency.toLowerCase()}/transfer`;
    const requestData: RequestData = {
        method: "POST",
        url: endpoint,
        payload: data,
        headers: { "x-api-key": Secrets.tatumApiKey },
    };
    return await doFetch(requestData);
};

export const offchainEstimateFee = async (data: FeeCalculationParams) => {
    try {
        console.log(data.tatumWallet.currency);
        const feeEstimateCallback: { [key: string]: any } = {
            BTC: await estimateLedgerToBlockchainFee(data),
            ETH: await estimateLedgerToBlockchainFee(data),
            XRP: await estimateLedgerToBlockchainFee(data),
            XLM: await estimateLedgerToBlockchainFee(data),
            BCH: await (async () => 0.001),
            LTC: await estimateLedgerToBlockchainFee(data),
            FLOW: await estimateLedgerToBlockchainFee(data),
            CELO: await estimateLedgerToBlockchainFee(data),
            EGLD: await estimateLedgerToBlockchainFee(data),
            TRON: await estimateLedgerToBlockchainFee(data),
            ADA: await estimateLedgerToBlockchainFee(data),
            QTUM: await estimateLedgerToBlockchainFee(data),
            BNB: await estimateLedgerToBlockchainFee(data),
            BSC: await estimateLedgerToBlockchainFee(data),
            DOGE: await estimateLedgerToBlockchainFee(data),
            VET: await estimateLedgerToBlockchainFee(data),
            ONE: await estimateLedgerToBlockchainFee(data),
            NEO: await estimateLedgerToBlockchainFee(data),
            BAT: await estimateLedgerToBlockchainFee(data),
            USDT: await estimateLedgerToBlockchainFee(data),
            WBTC: await estimateLedgerToBlockchainFee(data),
            USDC: await estimateLedgerToBlockchainFee(data),
            TUSD: await estimateLedgerToBlockchainFee(data),
            MKR: await estimateLedgerToBlockchainFee(data),
            LINK: await estimateLedgerToBlockchainFee(data),
            PAX: await estimateLedgerToBlockchainFee(data),
            PAXG: await estimateLedgerToBlockchainFee(data),
            UNI: await estimateLedgerToBlockchainFee(data),
        };
        return await feeEstimateCallback[data.tatumWallet.currency];
    } catch (error) {
        console.log(error);
        throw new Error("There was an error estimating withdraw fee.");
    }
};

export const estimateLedgerToBlockchainFee = async (data: FeeCalculationParams) => {
    const endpoint = `${TatumClient.baseUrl}/offchain/blockchain/estimate`;
    const requestData: RequestData = {
        method: "POST",
        url: endpoint,
        payload: {
            senderAccountId: data.senderAccountId,
            address: data.toAddress,
            amount: data.amount,
            xpub: data.tatumWallet.xpub,
        },
        headers: { "x-api-key": Secrets.tatumApiKey },
    };
    return (await doFetch(requestData)).fast;
};

export const estimateBCHFee = async (data: FeeCalculationParams) => {
    const endpoint = `${TatumClient.baseUrl}/offchain/blockchain/estimate`;
    const requestData: RequestData = {
        method: "POST",
        url: endpoint,
        payload: {
            senderAccountId: data.senderAccountId,
            address: data.toAddress,
            amount: data.amount,
            xpub: data.tatumWallet.xpub,
        },
        headers: { "x-api-key": Secrets.tatumApiKey },
    };
    return (await doFetch(requestData)).fast;
};
