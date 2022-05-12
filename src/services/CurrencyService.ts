import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { LedgerAccountTypes } from "../types";

@Injectable()
export class CurrencyService {
    @Inject()
    private prismaService: PrismaService;

    public async findLedgerAccount(walletId: string, tokenId: string) {
        return this.prismaService.currency.findFirst({
            where: {
                walletId,
                tokenId,
            },
        });
    }
    
    public async getCurrenciesByUserId(userId: string) {
        return this.prismaService.currency.findMany({
            where: {
                wallet: { userId },
            },
            include: { token: true },
        });
    }

    public async addNewAccount(data: LedgerAccountTypes) {
        return await this.prismaService.currency.create({
            data: {
                tatumId: data.newLedgerAccount?.id!,
                tokenId: data.token.id,
                symbol: data.symbol,
                walletId: data.wallet.id,
                depositAddress: data?.address,
                memo: data?.memo,
                message: data?.message,
                destinationTag: data?.destinationTag,
                derivationKey: data?.derivationKey,
            },
        });
    }
}
