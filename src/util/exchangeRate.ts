import { getRedis } from "../clients/redis";
import { doFetch, RequestData } from "./fetchRequest";

interface SymbolData {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
}

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
    const cacheKey = "exchangeRatesForCrypto";
    let cachedResponse = await getRedis().get(cacheKey);
    if (cachedResponse) {
        cachedResponse = JSON.parse(cachedResponse);
        const symbolData = cachedResponse.find((item: SymbolData) => item.symbol === symbol);
        if (symbolData) {
            return symbolData.current_price;
        }
        return 1;
    }
    const requestData: RequestData = {
        method: "GET",
        url: `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false`,
    };
    const data = await doFetch(requestData);
    await getRedis().set(cacheKey, JSON.stringify(data));
    await getRedis().expire(cacheKey, 3600);
    const symbolData = data.find((item: SymbolData) => item.symbol === symbol);
    if (symbolData) {
        return symbolData.current_price;
    }
    return 1;
};

export const getExchangeRateForCryptoV2 = async (symbol: string) => {
    symbol = symbol.toUpperCase();
    const apiKey = "efe97a3f1582b2319afc10add7fb926991e86e386d0dca653d71126bfa4f1d1d";
    const requestData: RequestData = {
        method: "GET",
        url: `https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD&api_key=${apiKey}`,
    };
    const data = await doFetch(requestData);
    return data[symbol] || 1;
};

export const getTokenValueInUSD = async (token: string, amount: number) => {
    token = token.toUpperCase();
    let tokenValue = 1;
    try {
        tokenValue = await getExchangeRateForCryptoV2(token);
    } catch (error) {}
    const valueInUSD = token === "COIIN" ? parseFloat(process.env.COIIN_VALUE || "0.2") : tokenValue;
    return valueInUSD * amount;
};

export const getCurrencyValueInUSD = async (currency: string, amount: number) => {
    currency = currency.toUpperCase();
    const valueInUSD = currency === "USD" ? 1 : await getExchangeRateForCurrency(currency);
    return amount / valueInUSD;
};
