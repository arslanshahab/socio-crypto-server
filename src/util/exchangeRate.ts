import { getRedis } from "../clients/redis";
import { doFetch, RequestData } from "./fetchRequest";
import { COIIN } from "./constants";
import { MarketData } from "../models/MarketData";
import { ILike } from "typeorm";

export const getExchangeRateForCurrency = async (symbol: string) => {
    const cacheKey = "exchangeRatesForStore";
    let cachedResponse = await getRedis().get(cacheKey);
    if (cachedResponse) {
        cachedResponse = JSON.parse(cachedResponse);
        return cachedResponse?.conversion_rates[symbol] || 1;
    }
    const apiKey = "f095f73226e7facf74af9216";
    const requestData: RequestData = {
        method: "GET",
        url: `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
    };
    const data = await doFetch(requestData);
    await getRedis().set(cacheKey, JSON.stringify(data));
    await getRedis().expire(cacheKey, 3600);
    return data?.conversion_rates[symbol] || 1;
};

export const getExchangeRateForCrypto = async (symbol: string) => {
    symbol = symbol.toLowerCase();
    if (symbol === COIIN) return parseFloat(process.env.COIIN_VALUE || "0.2");
    const symbolData = await MarketData.findOne({ where: { symbol: ILike(symbol) } });
    if (symbolData) {
        return symbolData.price;
    }
    return 1;
};

export const getTokenValueInUSD = async (token: string, amount: number) => {
    token = token.toUpperCase();
    let tokenValue = 1;
    try {
        tokenValue = await getExchangeRateForCrypto(token);
    } catch (error) {}
    return tokenValue * amount;
};

export const getCurrencyValueInUSD = async (currency: string, amount: number) => {
    currency = currency.toUpperCase();
    const valueInUSD = currency === "USD" ? 1 : await getExchangeRateForCurrency(currency);
    return amount / valueInUSD;
};
