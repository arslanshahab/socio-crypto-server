import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { SymbolNetworkParams } from "../types";

@Injectable()
export class TokenService {
    @Inject()
    private prismaService: PrismaService;

    public async findToken(data: SymbolNetworkParams) {
        return await this.prismaService.token.findFirst({
            where: { symbol: data.symbol.toUpperCase(), network: data.network.toUpperCase(), enabled: true },
        });
    }
}
