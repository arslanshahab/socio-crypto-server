import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class TatumWalletService {
    @Inject()
    private prismaService: PrismaService;

    public async findTatumWallet(symbol: string) {
        return this.prismaService.tatumWallet.findFirst({ where: { currency: symbol } });
    }
}
