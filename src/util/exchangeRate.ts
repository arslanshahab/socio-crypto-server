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
    const exchangeRates = await doFetch(requestData);
    const data = await exchangeRates.json();
    await getRedis().set(cacheKey, JSON.stringify(data));
    await getRedis().expire(cacheKey, 3600);
    return data?.conversion_rates[symbol] || 1;
};

export const getExchangeRateForCrypto = async (symbol: string) => {
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
    const cryptoMarketRates = await doFetch(requestData);
    const data = await cryptoMarketRates.json();
    await getRedis().set(cacheKey, JSON.stringify(data));
    await getRedis().expire(cacheKey, 3600);
    const symbolData = data.find((item: SymbolData) => item.symbol === symbol);
    if (symbolData) {
        return symbolData.current_price;
    }
    return 1;
};
