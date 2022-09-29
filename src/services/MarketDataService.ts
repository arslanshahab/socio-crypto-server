import { Inject, Injectable } from "@tsed/di";
import { CacheKeys, COIIN } from "../util/constants";
import { PlatformCache } from "@tsed/common";
import { MarketData } from "../models/MarketData";
import { readPrisma } from "../clients/prisma";

@Injectable()
export class MarketDataService {
    @Inject()
    private cache: PlatformCache;

    public async findMarketData(symbol: string) {
        const cacheKey = `${CacheKeys.MARKET_DATA_SERVICE}:${symbol}`;
        let marketData = await this.cache.get(cacheKey);
        if (marketData) return JSON.parse(marketData as string);
        marketData = await readPrisma.marketData.findFirst({
            where: { symbol },
        });
        this.cache.set(cacheKey, JSON.stringify(marketData), { ttl: 900 });
        return marketData as MarketData;
    }

    public async getExchangeRateForCrypto(symbol: string) {
        if (symbol.toUpperCase() === COIIN) return parseFloat(process.env.COIIN_VALUE || "0.2");
        return (await this.findMarketData(symbol))?.price || 1;
    }

    public async getTokenValueInUSD(token: string, amount: number) {
        const price = await this.getExchangeRateForCrypto(token);
        console.log(token, amount, price.toString());
        return (await this.getExchangeRateForCrypto(token)) * amount;
    }

    public async getMinWithdrawableAmount(symbol: string) {
        const minLimit = parseFloat(process?.env?.MIN_WITHDRAW_LIMIT || "100");
        const marketRate =
            symbol.toUpperCase() === COIIN
                ? parseFloat(process.env.COIIN_VALUE || "0.2")
                : await this.getExchangeRateForCrypto(symbol);
        return (1 / marketRate) * minLimit;
    }
}
