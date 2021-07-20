import { getRedis } from "../clients/redis";
import { doFetch } from "./fetchRequest";
getRedis;

export const getExchangeRate = async (symbol: string) => {
    const cacheKey = "exchangeRatesForStore";
    let cachedResponse = await getRedis().get(cacheKey);
    if (cachedResponse) {
        cachedResponse = JSON.parse(cachedResponse);
        return cachedResponse?.conversion_rates[symbol] || 1;
    }
    const apiKey = "f095f73226e7facf74af9216";
    const exchangeRates = await doFetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`, null, "GET", {});
    const data = await exchangeRates.json();
    await getRedis().set(cacheKey, JSON.stringify(data));
    await getRedis().expire(cacheKey, 3600);
    return data?.conversion_rates[symbol] || 1;
};
