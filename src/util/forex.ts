import { doFetch } from "./fetchRequest";

export const getExchangeRate = async (symbol: string) => {
    const key = "f095f73226e7facf74af9216";
    const exchangeRates = await doFetch(`https://v6.exchangerate-api.com/v6/${key}/latest/USD`, null, "GET", {});
    const data = await exchangeRates.json();
    return data?.conversion_rates[symbol] || 1;
};
