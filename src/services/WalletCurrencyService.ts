import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class WalletCurrencyService {
    @Inject()
    private prismaService: PrismaService;

    public async newWalletCurrency(type: string, walletId?: string) {
        return await this.prismaService.walletCurrency.create({
            data: {
                type: type.toLowerCase(),
                walletId: walletId && walletId,
            },
        });
    }

    public async findWalletCurrencyByWalletId(walletId: string, walletCurrencyId: string) {
        return await this.prismaService.walletCurrency.findFirst({
            where: {
                id: walletCurrencyId,
                walletId: walletId,
            },
        });
    }

    public async deleteWalletCurrency(id: string) {
        return await this.prismaService.walletCurrency.delete({ where: { id } });
    }
}
