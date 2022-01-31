import { TatumClient, USER_WITHDRAW_FEE, WithdrawPayload } from "../clients/tatumClient";
import { Currency } from "../models/Currency";
import { BN } from ".";
import { Org } from "../models/Org";
import { Transfer } from "../models/Transfer";
import { formatFloat } from "./index";
import { getExchangeRateForCrypto } from "./exchangeRate";
import { RAIINMAKER_ORG_NAME } from "./constants";

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

export const SYMBOL_TO_CHAIN: { [key: string]: string } = {
    BTC: "BTC",
    ETH: "ETH",
    XRP: "XRP",
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
    // USDT: "ETH",
    WBTC: "ETH",
    USDC: "ETH",
    TUSD: "ETH",
    MKR: "ETH",
    LINK: "ETH",
    PAXG: "ETH",
    UNI: "ETH",
    CAKE: "BSC",
    BUSD: "BSC",
    BBTC: "BSC",
    BETH: "BSC",
    WBNB: "BSC",
    BDOT: "BSC",
    BXRP: "BSC",
    BLTC: "BSC",
    BBCH: "BSC",
};

export const SYMBOL_TO_CONTRACT: { [key: string]: string } = {
    ETH: "0x0000000",
    BSC: "0x0000000",
    USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    BAT: "0x0d8775f648430679a709e98d2b0cb6250d2887ef",
    WBTC: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    TUSD: "0x0000000000085d4780B73119b644AE5ecd22b376",
    MKR: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
    LINK: "0x514910771af9ca656af840dff83e8264ecf986ca",
    PAXG: "0x45804880De22913dAFE09f4980848ECE6EcbAf78",
    UNI: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    CAKE: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
    BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
    BBTC: "0x5b0dfe077b16479715c9838eb644892008abbfe6",
    BETH: "0x250632378e573c6be1ac2f97fcdf00515d0aa91b",
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    BDOT: "0x08bd7F9849f8EEC12fd78c9fED6ba4e47269e3d5",
    BXRP: "0xb48063146a5ea2a4114a62d7fe6ed59ed2094b68",
    BLTC: "0x173b3bbe6492ce717f4b8a6e57a0c308e732a91e",
    BBCH: "0x003ab14e9e91e64f8826bb096657990c83e5d195",
};

export const offchainEstimateFee = async (data: WithdrawPayload): Promise<number> => {
    const chain = TatumClient.getBaseChain(data.currency.symbol);
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
    const base = TatumClient.isERC20(data.currency.symbol) ? "ETH" : "BNB";
    let fee = await offchainEstimateFee(data);
    if (TatumClient.isSubCustodialToken(data.currency.symbol)) {
        fee = await getFeeInSymbol(base, data.currency.symbol, fee);
    }
    adjustedAmount = adjustedAmount - fee;
    return {
        withdrawAbleAmount: formatFloat(adjustedAmount),
        fee: formatFloat(fee),
    };
};

export const transferFundsToRaiinmaker = async (data: { currency: Currency; amount: string }): Promise<any> => {
    const raiinmakerCurrency = await Org.getCurrencyForRaiinmaker(data.currency.symbol);
    if (!raiinmakerCurrency) throw new Error("Currency not found for raiinmaker.");
    const transferData = await TatumClient.transferFunds(
        data.currency.tatumId,
        raiinmakerCurrency.tatumId,
        data.amount,
        USER_WITHDRAW_FEE
    );
    const newTransfer = Transfer.initTatumTransfer({
        txId: transferData?.reference,
        symbol: data.currency.symbol,
        amount: new BN(data.amount),
        action: "FEE",
        wallet: raiinmakerCurrency.wallet,
        tatumId: raiinmakerCurrency.tatumId,
    });
    newTransfer.save();
};
