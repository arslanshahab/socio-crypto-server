import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { LedgerAccountTypes } from "../types";
import { WalletService } from "./WalletService";

@Injectable()
export class CurrencyService {
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private walletService: WalletService;

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
                tatumId: data?.id,
                tokenId: data.token.id,
                symbol: data.symbol,
                walletId: data.wallet.id,
                depositAddress: data.address ? data.address : null,
                memo: data.memo ? data.memo : null,
                message: data.message ? data.message : null,
                destinationTag: data.destinationTag ? data.destinationTag : null,
                derivationKey: data.derivationKey ? data.derivationKey : null,
            },
        });
    }

    public async findCurrencyByOrgId(orgId: string, tokenId: string) {
        const wallet = await this.walletService.findWalletByOrgId(orgId);
        return this.prismaService.currency.findFirst({
            where: { walletId: wallet?.id, tokenId },
        });
    }

    public async findCurrencyByTokenId(tokenId: string, walletId: string) {
        return this.prismaService.currency.findFirst({
            where: { tokenId, walletId },
        });
    }
}
