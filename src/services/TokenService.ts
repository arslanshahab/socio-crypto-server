import { Injectable } from "@tsed/di";
import { SymbolNetworkParams } from "types";
import { readPrisma } from "../clients/prisma";

@Injectable()
export class TokenService {
    public async findToken(data: SymbolNetworkParams) {
        return await readPrisma.token.findFirst({
            where: { symbol: data.symbol.toUpperCase(), network: data.network.toUpperCase(), enabled: true },
        });
    }

    public async findTokenBySymbol(data: SymbolNetworkParams) {
        return readPrisma.token.findFirst({
            where: { symbol: data.symbol.toUpperCase(), network: data.network.toUpperCase() },
        });
    }

    public async getEnabledTokens() {
        return readPrisma.token.findMany({ where: { enabled: true } });
    }
}
