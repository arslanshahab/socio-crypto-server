import { Prisma } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class TransferService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves transfers for a given wallet
     *
     * @param walletId the wallet the transfers belong to
     * @param symbol symbols to filter transfers by
     * @param type types of transfers to retrieve
     * @param skip number of transfers in the list to skip
     * @param take number of transfers to return, at max
     * @returns a partial list of transfers, and a count of all transfers
     */
    public async findByWallet(params: { walletId: string; symbol?: string; type: string; skip: number; take: number }) {
        const where: Prisma.TransferWhereInput = {
            walletId: params.walletId,
            ...(params.symbol && { currency: { equals: params.symbol, mode: "insensitive" } }),
            ...(params.type !== "ALL" && { action: params.type }),
        };

        return this.prismaService.$transaction([
            this.prismaService.transfer.findMany({
                where,
                skip: params.skip,
                take: params.take,
            }),
            this.prismaService.transfer.count({ where }),
        ]);
    }

    public async findTransferByCampaignId(campaignId: string) {
        return this.prismaService.transfer.findMany({
            where: { campaignId },
        });
    }

    public async deleteTransferPayouts(campaignId: string) {
        return await this.prismaService.transfer.deleteMany({
            where: { campaignId },
        });
    }
}
