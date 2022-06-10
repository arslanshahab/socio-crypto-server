import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { COIIN } from "../util/constants";
import { PlatformCache } from "@tsed/common";
import { MarketData } from "../models/MarketData";

@Injectable()
export class MarketDataService {
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private cache: PlatformCache;

    public async findMarketData(symbol: string) {
        const cacheKey = `market:data-${symbol}`;
        let marketData = await this.cache.get(cacheKey);
        console.log("murad-malik", typeof marketData);
        if (marketData) return JSON.parse(marketData as string);
        marketData = this.prismaService.marketData.findFirst({
            where: { symbol: { contains: symbol, mode: "insensitive" } },
        });
        this.cache.set(cacheKey, JSON.stringify(marketData), { ttl: 900 });
        return marketData as MarketData;
    }

    public async getExchangeRateForCrypto(symbol: string) {
        if (symbol.toUpperCase() === COIIN) return parseFloat(process.env.COIIN_VALUE || "0.2");
        return (await this.findMarketData(symbol))?.price || 1;
    }

    public async getTokenValueInUSD(token: string, amount: number) {
        return (await this.getExchangeRateForCrypto(token)) * amount;
    }
}
