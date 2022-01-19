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
import { TatumClient, FeeCalculationParams, USER_WITHDRAW_FEE } from "../clients/tatumClient";
import { Currency } from "../models/Currency";
import { Wallet } from "../models/Wallet";
import { BN, getERC20ValueOfETH } from ".";
import { Org } from "../models/Org";
import { Transfer } from "../models/Transfer";

interface WithdrawFeeData {
    withdrawAbleAmount: string;
    fee: string;
}

const BCH_DEFAULT_WITHDRAW_FEE = 0.001;
const BNB_DEFAULT_WITHDRAW_FEE = 0.0005;
const XLM_DEFAULT_WITHDRAW_FEE = 20;
const XRP_DEFAULT_WITHDRAW_FEE = 10;
// const DOGE_DEFAULT_WITHDRAW_FEE = 5;
// const LTC_DEFAULT_WITHDRAW_FEE = 0.001;

const fixDecimals = (num: any) => {
    if (typeof num === "string") {
        num = parseFloat(num);
    }
    return num.toFixed(11);
};

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
            return await sendERC20OffchainTransaction(body);
        case "USDT":
            return await sendERC20OffchainTransaction(body);
        case "WBTC":
            return await sendERC20OffchainTransaction(body);
        case "USDC":
            return await sendERC20OffchainTransaction(body);
        case "TUSD":
            return await sendERC20OffchainTransaction(body);
        case "MKR":
            return await sendERC20OffchainTransaction(body);
        case "LINK":
            return await sendERC20OffchainTransaction(body);
        case "PAX":
            return await sendERC20OffchainTransaction(body);
        case "PAXG":
            return await sendERC20OffchainTransaction(body);
        case "UNI":
            return await sendERC20OffchainTransaction(body);
        default:
            throw new Error(`Withdraws for ${currency} are not supported at this moment.`);
    }
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

const sendERC20OffchainTransaction = async (data: any) => {
    const endpoint = `${TatumClient.baseUrl}/offchain/ethereum/erc20/transfer`;
    const requestData: RequestData = {
        method: "POST",
        url: endpoint,
        payload: data,
        headers: { "x-api-key": Secrets.tatumApiKey },
    };
    return await doFetch(requestData);
};

export const offchainEstimateFee = async (data: FeeCalculationParams): Promise<number> => {
    switch (data.tatumWallet.currency.toUpperCase()) {
        case "BTC":
            return await estimateLedgerToBlockchainFee(data);
        case "ETH":
            return await estimateWithdrawFee(data);
        case "XRP":
            return XRP_DEFAULT_WITHDRAW_FEE;
        case "XLM":
            return XLM_DEFAULT_WITHDRAW_FEE;
        case "BCH":
            return BCH_DEFAULT_WITHDRAW_FEE;
        case "LTC":
            return await estimateLedgerToBlockchainFee(data);
        case "FLOW":
            return estimateLedgerToBlockchainFee(data);
        case "CELO":
            return await estimateLedgerToBlockchainFee(data);
        case "EGLD":
            return await estimateLedgerToBlockchainFee(data);
        case "TRON":
            return await estimateLedgerToBlockchainFee(data);
        case "ADA":
            return await estimateLedgerToBlockchainFee(data);
        case "QTUM":
            return estimateLedgerToBlockchainFee(data);
        case "BNB":
            return BNB_DEFAULT_WITHDRAW_FEE;
        case "BSC":
            return await estimateWithdrawFee(data);
        case "DOGE":
            return await estimateLedgerToBlockchainFee(data);
        case "VET":
            return estimateLedgerToBlockchainFee(data);
        case "ONE":
            return estimateLedgerToBlockchainFee(data);
        case "NEO":
            return estimateLedgerToBlockchainFee(data);
        case "BAT":
            return await estimateLedgerToBlockchainFee(data);
        case "USDT":
            return await estimateWithdrawFee(data);
        case "WBTC":
            return await estimateLedgerToBlockchainFee(data);
        case "USDC":
            return await estimateLedgerToBlockchainFee(data);
        case "TUSD":
            return await estimateLedgerToBlockchainFee(data);
        case "MKR":
            return await estimateLedgerToBlockchainFee(data);
        case "LINK":
            return await estimateLedgerToBlockchainFee(data);
        case "PAX":
            return await estimateLedgerToBlockchainFee(data);
        case "PAXG":
            return await estimateLedgerToBlockchainFee(data);
        case "UNI":
            return await estimateLedgerToBlockchainFee(data);
        default:
            throw new Error("There was an error calculating withdraw fee.");
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
            amount: String(data.amount),
            xpub: data.tatumWallet.xpub,
        },
        headers: { "x-api-key": Secrets.tatumApiKey },
    };
    const resp = await doFetch(requestData);
    return parseFloat(fixDecimals(resp.fast));
};

export const estimateWithdrawFee = async (data: FeeCalculationParams) => {
    const endpoint = `${TatumClient.baseUrl}/blockchain/estimate`;
    const chain = symbolToChain[data.tatumWallet.currency];
    let feeAmount = 0;
    const requestData: RequestData = {
        method: "POST",
        url: endpoint,
        payload: {
            chain,
            amount: String(data.amount),
            type: "TRANSFER_ERC20",
            sender: data.currency.depositAddress,
            recipient: data.toAddress,
        },
        headers: { "x-api-key": Secrets.tatumApiKey },
    };
    const resp = await doFetch(requestData);
    if (chain === "ETH" || chain === "BSC") {
        feeAmount = (resp.gasLimit * resp.gasPrice) / 10 ** 10;
    } else {
        feeAmount = resp.fast;
    }
    return parseFloat(fixDecimals(feeAmount));
};

export const findOrCreateCurrency = async (symbol: string, wallet: Wallet): Promise<Currency> => {
    let ledgerAccount = await Currency.findOne({ where: { wallet, symbol } });
    if (!ledgerAccount) {
        const newLedgerAccount = await TatumClient.createLedgerAccount(symbol);
        const newDepositAddress = await TatumClient.generateDepositAddress(newLedgerAccount.id);
        ledgerAccount = await Currency.addAccount({
            ...newLedgerAccount,
            ...newDepositAddress,
            wallet,
        });
    }
    return ledgerAccount;
};

export const adjustWithdrawableAmount = async (data: FeeCalculationParams): Promise<WithdrawFeeData> => {
    const chain = symbolToChain[data.currency.symbol];
    let adjustedAmount = new BN(fixDecimals(data.amount));
    let fee = await TatumClient.calculateWithdrawFee(data);
    if (chain === "ETH" && data.currency.symbol !== chain) {
        fee = await getERC20ValueOfETH(data.currency.symbol, fee);
        adjustedAmount = adjustedAmount.minus(fee);
    } else {
        adjustedAmount = adjustedAmount.minus(fee);
    }
    return {
        withdrawAbleAmount: fixDecimals(adjustedAmount.toNumber()),
        fee: fixDecimals(fee),
    };
};

export const transferFundsToRaiinmaker = async (data: { currency: Currency; amount: string }): Promise<any> => {
    const chain = symbolToChain[data.currency.symbol];
    if (chain === "ETH" && data.currency.symbol !== chain) {
        const raiinmakerOrg = await Org.findOne({ where: { name: "raiinmaker" }, relations: ["wallet"] });
        if (!raiinmakerOrg) throw new Error("Org not found for raiinmaker.");
        const raiinmakerCurrency = await Currency.findOne({ where: { wallet: raiinmakerOrg?.wallet } });
        if (!raiinmakerCurrency) throw new Error("Currency not found for raiinmaker.");
        await TatumClient.transferFunds(
            data.currency.tatumId,
            raiinmakerCurrency.tatumId,
            data.amount,
            USER_WITHDRAW_FEE
        );
        const newTransfer = Transfer.initTatumTransfer({
            symbol: raiinmakerCurrency.symbol,
            amount: new BN(data.amount),
            action: "DEPOSIT",
            wallet: raiinmakerOrg.wallet,
            tatumId: data.currency.tatumId,
        });
        return await newTransfer.save();
    }
};
