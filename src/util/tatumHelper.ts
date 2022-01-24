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
import {
    TatumClient,
    FeeCalculationParams,
    USER_WITHDRAW_FEE,
    WalletKeys,
    WithdrawPayload,
} from "../clients/tatumClient";
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

export const performOffchainWithdraw = async (payload: WithdrawPayload & WalletKeys) => {
    const chain = TatumClient.getBaseChain(payload.currency.symbol);
    const { withdrawAbleAmount, fee } = await adjustWithdrawableAmount({
        senderAccountId: payload.currency.tatumId,
        toAddress: payload.address,
        amount: payload.amount,
        tatumWallet: payload.wallet,
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
                return await sendEthOffchainTransaction(false, body as any);
            case "XRP":
                return await sendXrpOffchainTransaction(false, body as any);
            case "XLM":
                return await sendXlmOffchainTransaction(false, body as any);
            case "BCH":
                return await sendBitcoinCashOffchainTransaction(false, body as any);
            case "LTC":
                return await sendLitecoinOffchainTransaction(false, body as any);
            case "FLOW":
                return sendTokenOffchainTransaction(payload);
            case "CELO":
                return await sendCeloOffchainTransaction(false, body as any);
            case "TRON":
                return await sendTronOffchainTransaction(false, body as any);
            case "ADA":
                return await sendAdaOffchainTransaction(false, body as any);
            case "BNB":
                return sendTokenOffchainTransaction(payload);
            case "BSC":
                return await sendBscOffchainTransaction(false, body as any);
            case "DOGE":
                return await sendDogecoinOffchainTransaction(false, body as any);
            default:
                throw new Error(`Withdraws for ${body.currency.symbol} are not supported at this moment.`);
        }
    };
    await callWithdrawMethod();
    await transferFundsToRaiinmaker({
        currency: payload.currency,
        amount: String(payload.amount - parseFloat(withdrawAbleAmount)),
    });
    return true;
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
        default:
            throw new Error("There was an error calculating withdraw fee.");
    }
};

const sendTokenOffchainTransaction = async (data: WithdrawPayload & WalletKeys) => {
    const endpoint = `${TatumClient.baseUrl}/offchain/${data.currency.symbol.toLowerCase()}/transfer`;
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
        fee = await getERC20ValueOfETH(data.currency.symbol, fee);
    }
    if (chain === "BSC" && data.currency.symbol !== chain) {
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
