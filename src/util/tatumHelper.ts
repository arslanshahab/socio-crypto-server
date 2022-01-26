import { TatumClient, FeeCalculationParams, USER_WITHDRAW_FEE } from "../clients/tatumClient";
import { Currency } from "../models/Currency";
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

export const SYMBOL_TO_CHAIN: { [key: string]: string } = {
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
    DAI: "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
    // BXRP: "BSC",
    // BLTC: "BSC",
    // BBCH: "BSC",
};

export const fixDecimalsForTatum = (num: any) => {
    if (typeof num === "string") {
        num = parseFloat(num);
    }
    return num.toFixed(8);
};

export const offchainEstimateFee = async (data: FeeCalculationParams): Promise<number> => {
    const chain = TatumClient.getBaseChain(data.currency.symbol);
    switch (chain) {
        case "BTC":
            return await TatumClient.estimateLedgerToBlockchainFee(data);
        case "XRP":
            return XRP_DEFAULT_WITHDRAW_FEE;
        case "XLM":
            return XLM_DEFAULT_WITHDRAW_FEE;
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
            return await TatumClient.estimateETHWithdrawFee(data);
        case "BSC":
            return await TatumClient.estimateBSCWithdrawFee(data);
        default:
            throw new Error("There was an error calculating withdraw fee.");
    }
};

export const adjustWithdrawableAmount = async (data: FeeCalculationParams): Promise<WithdrawFeeData> => {
    const chain = TatumClient.getBaseChain(data.currency.symbol);
    let adjustedAmount = fixDecimalsForTatum(data.amount);
    let fee = await offchainEstimateFee(data);
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
            symbol: data.currency.symbol,
            amount: new BN(data.amount),
            action: "FEE",
            wallet: raiinmakerOrg.wallet,
            tatumId: raiinmakerCurrency.tatumId,
        });
        newTransfer.save();
    }
};
