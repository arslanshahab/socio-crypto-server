import { TatumClient, USER_WITHDRAW_FEE, WithdrawPayload } from "../clients/tatumClient";
import { Currency } from "../models/Currency";
import { BN } from ".";
import { Org } from "../models/Org";
import { Transfer } from "../models/Transfer";
import { formatFloat } from "./index";
import { getExchangeRateForCrypto } from "./exchangeRate";

interface WithdrawFeeData {
    withdrawAbleAmount: string;
    fee: string;
}

const BCH_DEFAULT_WITHDRAW_FEE = 0.001;
const BNB_DEFAULT_WITHDRAW_FEE = 0.0005;
const XRP_DEFAULT_WITHDRAW_FEE = 0.1;
// const DOGE_DEFAULT_WITHDRAW_FEE = 5;
// const LTC_DEFAULT_WITHDRAW_FEE = 0.001;
// const XLM_DEFAULT_WITHDRAW_FEE = 0.01;

export const offchainEstimateFee = async (data: WithdrawPayload): Promise<number> => {
    const chain = data.currency.token.network;
    switch (chain) {
        case "BTC":
            return await TatumClient.estimateLedgerToBlockchainFee(data);
        case "XRP":
            return XRP_DEFAULT_WITHDRAW_FEE;
        case "BCH":
            return BCH_DEFAULT_WITHDRAW_FEE;
        case "LTC":
            return await TatumClient.estimateLedgerToBlockchainFee(data);
        case "FLOW":
            return TatumClient.estimateLedgerToBlockchainFee(data);
        case "CELO":
            return await TatumClient.estimateLedgerToBlockchainFee(data);
        case "EGLD":
            return await TatumClient.estimateLedgerToBlockchainFee(data);
        case "TRON":
            return await TatumClient.estimateLedgerToBlockchainFee(data);
        case "ADA":
            return await TatumClient.estimateLedgerToBlockchainFee(data);
        case "BNB":
            return BNB_DEFAULT_WITHDRAW_FEE;
        case "DOGE":
            return await TatumClient.estimateLedgerToBlockchainFee(data);
        case "ETH":
            return await TatumClient.estimateCustodialWithdrawFee(data);
        case "BSC":
            return await TatumClient.estimateCustodialWithdrawFee(data);
        default:
            throw new Error("There was an error calculating withdraw fee.");
    }
};

export const getFeeInSymbol = async (base: string, symbol: string, amount: number): Promise<number> => {
    const marketRateSymbol = await getExchangeRateForCrypto(symbol);
    const marketRateBase = await getExchangeRateForCrypto(base);
    const BasetoSymbol = marketRateBase / marketRateSymbol;
    return BasetoSymbol * amount;
};

export const adjustWithdrawableAmount = async (data: WithdrawPayload): Promise<WithdrawFeeData> => {
    let adjustedAmount = parseFloat(formatFloat(data.amount));
    const base = TatumClient.isERC20(data.currency.token) ? "ETH" : "BNB";
    let fee = await offchainEstimateFee(data);
    if (TatumClient.isSubCustodialToken(data.currency.token)) {
        fee = await getFeeInSymbol(base, data.currency.token.symbol, fee);
    }
    adjustedAmount = adjustedAmount - fee;
    return {
        withdrawAbleAmount: formatFloat(adjustedAmount),
        fee: formatFloat(fee),
    };
};

export const transferFundsToRaiinmaker = async (data: { currency: Currency; amount: string }): Promise<any> => {
    const raiinmakerCurrency = await Org.getCurrencyForRaiinmaker(data.currency.token);
    if (!raiinmakerCurrency) throw new Error("Currency not found for raiinmaker.");
    const transferData = await TatumClient.transferFunds({
        senderAccountId: data.currency.tatumId,
        recipientAccountId: raiinmakerCurrency.tatumId,
        amount: data.amount,
        recipientNote: USER_WITHDRAW_FEE,
    });
    const newTransfer = Transfer.initTatumTransfer({
        txId: transferData?.reference,
        symbol: data.currency.token.symbol,
        network: data.currency.token.network,
        amount: new BN(data.amount),
        action: "FEE",
        wallet: raiinmakerCurrency.wallet,
        tatumId: raiinmakerCurrency.tatumId,
    });
    newTransfer.save();
};
