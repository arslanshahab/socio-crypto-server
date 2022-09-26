import { Inject, Injectable } from "@tsed/di";
import { LedgerAccountTypes } from "types.d.ts";
import { WalletService } from "./WalletService";
import { Prisma } from "@prisma/client";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class CurrencyService {
    @Inject()
    private walletService: WalletService;

    public async findLedgerAccount(walletId: string, tokenId: string) {
        return readPrisma.currency.findFirst({
            where: {
                walletId,
                tokenId,
            },
        });
    }

    public async getCurrenciesByUserId(userId: string) {
        return readPrisma.currency.findMany({
            where: {
                wallet: { userId },
            },
            include: { token: true },
        });
    }

    public async addNewAccount(data: LedgerAccountTypes) {
        return await prisma.currency.create({
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
        return readPrisma.currency.findFirst({
            where: { walletId: wallet?.id, tokenId },
        });
    }

    public async findCurrencyByTokenAndWallet(data: { tokenId: string; walletId: string }) {
        return readPrisma.currency.findFirst({
            where: { ...data },
        });
    }

    /**
     * Updates the deposit address for the given currency
     *
     * @param currency the currency to update
     * @param address the new address
     * @returns the updated currency
     */
    public async updateDepositAddress(currencyId: string, address: string) {
        return prisma.currency.update({
            where: { id: currencyId },
            data: { depositAddress: address },
        });
    }

    public async findCurrenciesByWalletId<T extends Prisma.CurrencyInclude | undefined>(walletId: string, include?: T) {
        return readPrisma.currency.findMany({
            where: { walletId },
            include: include as T,
        });
    }

    public async updateBalance(data: { currencyId: string; accountBalance: number; availableBalance: number }) {
        return await prisma.currency.update({
            where: { id: data.currencyId },
            data: {
                accountBalance: data?.accountBalance,
                availableBalance: data?.availableBalance,
            },
        });
    }
}
