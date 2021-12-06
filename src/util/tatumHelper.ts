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

const withdrawEndpoints: { [key: string]: string } = {
    BNB: "https://api-eu1.tatum.io/v3/offchain/bnb/transfer",
    FLOW: "https://api-eu1.tatum.io/v3/offchain/flow/transfer",
    QTUM: "https://api-eu1.tatum.io/v3/offchain/qtum/transfer",
    VET: "https://api-eu1.tatum.io/v3/offchain/vet/transfer",
    ONE: "https://api-eu1.tatum.io/v3/offchain/one/transfer",
    NEO: "https://api-eu1.tatum.io/v3/offchain/neo/transfer",
};

export const performWithdraw = async (currency: string, body: any) => {
    switch (currency.toUpperCase()) {
        case "BTC":
            return await sendBitcoinOffchainTransaction(false, body);
        case "ETH":
            return await sendEthOffchainTransaction(false, body);
        case "XRP":
            return await sendXrpOffchainTransaction(false, body);
        case "XLM":
            return await sendXlmOffchainTransaction(false, body);
        case "BCH":
            return await sendBitcoinCashOffchainTransaction(false, body);
        case "LTC":
            return await sendLitecoinOffchainTransaction(false, body);
        case "FLOW":
            return sendTokenOffchainTransaction(currency, body);
        case "CELO":
            return await sendCeloOffchainTransaction(false, body);
        case "EGLD":
            return await sendEgldOffchainTransaction(false, body);
        case "TRON":
            return await sendTronOffchainTransaction(false, body);
        case "ADA":
            return await sendAdaOffchainTransaction(false, body);
        case "QTUM":
            return sendTokenOffchainTransaction(currency, body);
        case "BNB":
            return sendTokenOffchainTransaction(currency, body);
        case "BSC":
            return await sendBscOffchainTransaction(false, body);
        case "DOGE":
            return await sendDogecoinOffchainTransaction(false, body);
        case "VET":
            return sendTokenOffchainTransaction(currency, body);
        case "ONE":
            return sendTokenOffchainTransaction(currency, body);
        case "NEO":
            return sendTokenOffchainTransaction(currency, body);
        case "BAT":
            return await sendEthOffchainTransaction(false, body);
        case "USDT":
            return await sendEthOffchainTransaction(false, body);
        case "WBTC":
            return await sendEthOffchainTransaction(false, body);
        case "USDC":
            return await sendEthOffchainTransaction(false, body);
        case "TUSD":
            return await sendEthOffchainTransaction(false, body);
        case "MKR":
            return await sendEthOffchainTransaction(false, body);
        case "LINK":
            return await sendEthOffchainTransaction(false, body);
        case "PAX":
            return await sendEthOffchainTransaction(false, body);
        case "PAXG":
            return await sendEthOffchainTransaction(false, body);
        case "UNI":
            return await sendEthOffchainTransaction(false, body);
        default:
            throw new Error(
                `withdraws for ${currency} are not supported at this moment. Be patient, we are working on it!`
            );
    }
};

const sendTokenOffchainTransaction = async (currency: string, data: any) => {
    const endpoint = withdrawEndpoints[currency];
    if (!endpoint) {
        throw new Error(
            `withdraws for ${currency} are not supported at this moment. Be patient, we are working on it!`
        );
    }
    const requestData: RequestData = {
        method: "POST",
        url: endpoint,
        payload: data,
        headers: { "x-api-key": Secrets.tatumApiKey },
    };
    const response = await doFetch(requestData);
    if (response.status !== 200) {
        const error: any = await response.json();
        console.log(error.data);
        throw new Error(error.message);
    }
    return await response.json();
};
