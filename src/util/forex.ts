import { getRedis } from "../clients/redis";
import { doFetch } from "./fetchRequest";
getRedis;

export const getExchangeRate = async (symbol: string) => {
    const cacheKey = "exchangeRatesForStore";
    let cachedResponse = await getRedis().get(cacheKey);
    cachedResponse = JSON.parse(cachedResponse);
    if (cachedResponse && cachedResponse.expiry && cachedResponse.expiry > new Date().getTime()) {
        return cachedResponse?.conversion_rates[symbol] || 1;
    }
    const key = "f095f73226e7facf74af9216";
    const exchangeRates = await doFetch(`https://v6.exchangerate-api.com/v6/${key}/latest/USD`, null, "GET", {});
    let data = await exchangeRates.json();
    data.expiry = new Date().getTime() + 3600000;
    await getRedis().set(cacheKey, JSON.stringify(data));
    return data?.conversion_rates[symbol] || 1;
};
