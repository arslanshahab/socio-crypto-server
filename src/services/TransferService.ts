import { Campaign, Prisma } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { endOfISOWeek, startOfISOWeek, subDays } from "date-fns";
import { TransferAction, TransferStatus } from "../types";
import { WalletService } from "./WalletService";
import { NotFound } from "@tsed/exceptions";
import { WALLET_NOT_FOUND } from "../util/errors";

@Injectable()
export class TransferService {
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private walletService: WalletService;

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

    public async getRewardForThisWeek(walletId: string, type: TransferAction) {
        const currentDate = new Date();
        const start = startOfISOWeek(currentDate);
        const end = endOfISOWeek(currentDate);
        return await this.prismaService.transfer.findFirst({
            where: {
                walletId,
                action: type,
                createdAt: {
                    gte: new Date(start),
                    lte: new Date(end),
                },
            },
        });
    }

    public async getLast24HourRedemption(walletId: string, type: TransferAction) {
        const currentDate = new Date();
        const date = subDays(currentDate, 1);
        return this.prismaService.transfer.count({
            where: {
                walletId,
                action: type,
                createdAt: {
                    gt: new Date(date),
                },
            },
        });
    }

    public async newReward(data: {
        walletId: string;
        amount: string;
        symbol: string;
        action: TransferAction;
        status: TransferStatus;
        campaign?: Campaign;
    }) {
        return await this.prismaService.transfer.create({
            data: {
                amount: data.amount,
                action: data.action,
                status: data.status,
                currency: data.symbol,
                walletId: data.walletId,
                campaignId: data.campaign ? data.campaign.id : null,
            },
        });
    }

    public async findUserTransactions(userId: string) {
        const wallet = await this.walletService.findWalletByUserId(userId);
        if (!wallet) throw new NotFound(WALLET_NOT_FOUND);
        return this.prismaService.transfer.findMany({
            where: { walletId: wallet.id },
        });
    }

    public async getCoiinRecord() {
        return this.prismaService.$transaction([
            this.prismaService.transfer.findMany({
                where: { OR: [{ action: "WITHDRAW" }, { action: "XOXODAY_REDEMPTION" }] },
            }),
            this.prismaService.transfer.findMany({
                where: {
                    OR: [
                        { action: "LOGIN_REWARD" },
                        { action: "REGISTRATION_REWARD" },
                        { action: "PARTICIPATION_REWARD" },
                        { action: "SHARING_REWARD" },
                        { action: "CAMPAIGN_REWARD" },
                        { action: "NETWORK_REWARD" },
                    ],
                },
            }),
        ]);
    }
}
