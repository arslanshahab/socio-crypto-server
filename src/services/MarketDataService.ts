import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { UseCache } from "@tsed/common";
import { COIIN } from "../util/constants";

@Injectable()
export class MarketDataService {
    @Inject()
    private prismaService: PrismaService;

    @UseCache({ ttl: 900, refreshThreshold: 300 })
    public async findMarketData(symbol: string) {
        return this.prismaService.marketData.findFirst({
            where: { symbol: { contains: symbol, mode: "insensitive" } },
        });
    }

    public async getExchangeRateForCrypto(symbol: string) {
        if (symbol.toUpperCase() === COIIN) return parseFloat(process.env.COIIN_VALUE || "0.2");
        return (await this.findMarketData(symbol))?.price || 1;
    }

    public async getTokenValueInUSD(token: string, amount: number) {
        return (await this.getExchangeRateForCrypto(token)) * amount;
    }
}
