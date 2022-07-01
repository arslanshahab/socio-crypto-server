import { Campaign, Prisma } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { endOfISOWeek, startOfDay, startOfISOWeek, subDays } from "date-fns";
import { TransferAction, TransferStatus } from "../types";
import { WalletService } from "./WalletService";
import { NotFound } from "@tsed/exceptions";
import { WALLET_NOT_FOUND } from "../util/errors";
import { startOfYear } from "date-fns";
import {
    CacheKeys,
    COIIN,
    TransferAction as TransferActionEnum,
    TransferStatus as TransferStatusEnum,
    TransferType,
    USD,
} from "../util/constants";
import { UseCache } from "@tsed/common";
import { prepareCacheKey } from "../util/index";

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
        type: TransferType;
        campaign?: Campaign;
    }) {
        return await this.prismaService.transfer.create({
            data: {
                amount: data.amount,
                action: data.action,
                status: data.status,
                currency: data.symbol,
                walletId: data.walletId,
                type: data.type,
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

    public async getWithdrawalsByStatus(status: TransferStatus) {
        return this.prismaService.transfer.findMany({
            where: { status, action: "withdraw" },
            include: {
                wallet: {
                    include: {
                        user: {
                            include: {
                                profile: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });
    }

    public async getTotalAnnualWithdrawalByWallet(walletId: string) {
        const usdAmount = await this.prismaService.transfer.findMany({
            where: {
                action: "withdraw",
                status: "APPROVED",
                walletId,
                updatedAt: { gte: startOfYear(new Date()) },
            },
            select: { usdAmount: true },
        });
        const sum = usdAmount.reduce((acc, curr) => acc + parseFloat(curr.usdAmount!), 0);
        return sum;
    }

    public async getTotalPendingByCurrencyInUsd(walletId: string) {
        return this.prismaService.transfer.findMany({
            where: { action: "withdraw", status: "PENDING", walletId },
            select: { currency: true, amount: true, usdAmount: true },
        });
    }

    public async getCoinnEarnedToday(walletId: string) {
        const today = startOfDay(new Date());
        const earnings = await this.prismaService.transfer.findMany({
            where: {
                currency: COIIN,
                createdAt: { gte: today },
                walletId,
            },
        });
        return earnings.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    }

    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.USER_PENDING_TRANSFERS, args),
    })
    public async getPendingWalletBalances(walletId: string, symbol: string) {
        const pendingCreditTransfers = await this.prismaService.transfer.findMany({
            where: {
                walletId,
                currency: symbol,
                type: TransferType.CREDIT,
                status: TransferStatusEnum.PENDING,
            },
        });
        const pendingDebitBalances = await this.prismaService.transfer.findMany({
            where: {
                walletId,
                currency: symbol,
                type: TransferType.DEBIT,
                status: TransferStatusEnum.PENDING,
            },
        });
        const credit = pendingCreditTransfers.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
        const debit = pendingDebitBalances.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
        return credit - debit;
    }

    public async newPendingUsdDeposit(
        walletId: string,
        orgId: string,
        amount: string,
        stripeCardId?: string,
        paypalAddress?: string
    ) {
        return await this.prismaService.transfer.create({
            data: {
                walletId,
                orgId,
                amount,
                status: TransferStatusEnum.PENDING,
                currency: USD.toLowerCase(),
                action: TransferActionEnum.DEPOSIT,
                stripeCardId: stripeCardId && stripeCardId,
                paypalAddress: paypalAddress && paypalAddress,
            },
        });
    }

    public async getAuditedWithdrawals() {
        return this.prismaService.transfer.findMany({
            where: {
                action: TransferActionEnum.WITHDRAW.toLowerCase(),
                OR: [{ status: TransferStatusEnum.APPROVED }, { status: TransferStatusEnum.REJECTED }],
            },
            include: {
                wallet: { include: { user: { include: { profile: true } } } },
            },
            orderBy: { createdAt: "asc" },
        });
    }

    public async findTransactionsByWalletId(walletId: string) {
        return this.prismaService.transfer.findMany({
            where: { walletId },
        });
    }

    public async initTatumTransfer(data: {
        txId?: string;
        symbol: string;
        network: string;
        campaignId?: string;
        amount: string;
        tatumId: string;
        walletId: string;
        action: TransferAction;
        status: TransferStatus;
        type: TransferType;
    }) {
        return await this.prismaService.transfer.create({
            data: {
                currency: data.symbol,
                ...(data.campaignId && { campaignId: data.campaignId }),
                ...(data.txId && { transactionHash: data.txId }),
                amount: data.amount,
                action: data.action,
                ethAddress: data.tatumId,
                walletId: data.walletId,
                status: data.status,
                type: data.type,
            },
        });
    }
}
