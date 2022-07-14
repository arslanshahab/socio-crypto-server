import { Injectable } from "@tsed/di";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class WalletCurrencyService {
    public async newWalletCurrency(type: string, walletId?: string) {
        return await prisma.walletCurrency.create({
            data: {
                type: type.toLowerCase(),
                walletId: walletId && walletId,
            },
        });
    }

    public async findWalletCurrencyByWalletId(walletId: string, walletCurrencyId: string) {
        return await readPrisma.walletCurrency.findFirst({
            where: {
                id: walletCurrencyId,
                walletId: walletId,
            },
        });
    }

    public async deleteWalletCurrency(id: string) {
        return await prisma.walletCurrency.delete({ where: { id } });
    }
}
