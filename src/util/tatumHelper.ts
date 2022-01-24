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

const fixDecimalsForTatum = (num: any) => {
    if (typeof num === "string") {
        num = parseFloat(num);
    }
    return num.toFixed(8);
};

export const performWithdraw = async (currency: string, body: any) => {
    const chain = TatumClient.getBaseChain(currency);
    switch (chain) {
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
        case "TRON":
            return await sendTronOffchainTransaction(false, body);
        case "ADA":
            return await sendAdaOffchainTransaction(false, body);
        case "BNB":
            return sendTokenOffchainTransaction(currency, body);
        case "BSC":
            return await sendBscOffchainTransaction(false, body);
        case "DOGE":
            return await sendDogecoinOffchainTransaction(false, body);
        default:
            throw new Error(`Withdraws for ${currency} are not supported at this moment.`);
    }
};

export const offchainEstimateFee = async (data: FeeCalculationParams): Promise<number> => {
    switch (data.tatumWallet.currency.toUpperCase()) {
        case "BTC":
            return await estimateLedgerToBlockchainFee(data);
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
        case "BNB":
            return BNB_DEFAULT_WITHDRAW_FEE;
        case "DOGE":
            return await estimateLedgerToBlockchainFee(data);
        case "ETH":
            return await estimateLedgerToBlockchainFee(data);
        case "BSC":
            return await estimateLedgerToBlockchainFee(data);
        default:
            throw new Error("There was an error calculating withdraw fee.");
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
    return parseFloat(fixDecimalsForTatum(resp.fast));
};

export const findOrCreateCurrency = async (symbol: string, wallet: Wallet): Promise<Currency> => {
    const foundWallet = await Wallet.findOne({ where: { id: wallet.id }, relations: ["user", "org"] });
    const baseChain = TatumClient.getBaseChain(symbol);
    const shouldCreateDepositAddress =
        Boolean(foundWallet?.user && baseChain !== "ETH" && baseChain !== "BSC") || Boolean(foundWallet?.org);
    let ledgerAccount = await Currency.findOne({ where: { wallet, symbol } });
    let newDepositAddress;
    if (!ledgerAccount) {
        const newLedgerAccount = await TatumClient.createLedgerAccount(symbol);
        if (shouldCreateDepositAddress)
            newDepositAddress = await TatumClient.generateDepositAddress(newLedgerAccount.id);
        ledgerAccount = await Currency.addAccount({
            ...newLedgerAccount,
            ...(newDepositAddress && newDepositAddress),
            wallet,
        });
    }
    return ledgerAccount;
};

export const adjustWithdrawableAmount = async (data: FeeCalculationParams): Promise<WithdrawFeeData> => {
    const chain = TatumClient.getBaseChain(data.currency.symbol);
    let adjustedAmount = fixDecimalsForTatum(data.amount);
    let fee = await TatumClient.calculateWithdrawFee(data);
    if (chain === "ETH" && data.currency.symbol !== chain) {
        console.log("mmmm mmm");
        fee = await getERC20ValueOfETH(data.currency.symbol, fee);
    }
    adjustedAmount = adjustedAmount - fee;
    return {
        withdrawAbleAmount: fixDecimalsForTatum(adjustedAmount),
        fee: fixDecimalsForTatum(fee),
    };
};

export const transferFundsToRaiinmaker = async (data: { currency: Currency; amount: string }): Promise<any> => {
    const chain = TatumClient.getBaseChain(data.currency.symbol);
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
