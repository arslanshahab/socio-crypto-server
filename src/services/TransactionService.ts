import { Inject, Injectable } from "@tsed/di";
import { ParticipantAction, SocialClientType, TransactionChainType, TransactionType } from "../util/constants";
import { prisma, readPrisma } from "../clients/prisma";
import { Transaction } from "@prisma/client";
import { L1DragonchainTransactionAugmented } from "types.d.ts";
import { DragonChainService } from "./DragonChainService";

@Injectable()
export class TransactionService {
    @Inject()
    private dragonChainService: DragonChainService;

    public async saveDragonchainTransaction(data: {
        txId: string;
        type: TransactionType;
        tag: string;
        participantId: string;
        campaignId: string;
        action?: ParticipantAction;
        socialType?: SocialClientType;
    }) {
        const { type, ...rest } = data;
        return await prisma.transaction.create({
            data: { ...rest, chain: TransactionChainType.DRAGON_CHAIN, transactionType: type },
        });
    }

    public async getPaginatedUserTransactions(data: {
        take: number;
        skip: number;
        userId: string;
    }): Promise<{ list: (Transaction & L1DragonchainTransactionAugmented)[]; total: number }> {
        const { userId, take, skip } = data;
        const userParticipations = await prisma.participant.findMany({ where: { userId } });
        const participationIds = userParticipations.map((item) => item.id);
        let [results, total] = await prisma.$transaction([
            readPrisma.transaction.findMany({
                where: { participantId: { in: participationIds } },
                take,
                skip,
                orderBy: { createdAt: "desc" },
            }),
            readPrisma.transaction.count({ where: { participantId: { in: participationIds } } }),
        ]);
        const transactionList = await this.dragonChainService.getBulkTransaction(
            results.filter((item) => item.chain === TransactionChainType.DRAGON_CHAIN).map((item) => item.txId)
        );
        if (!transactionList) throw new Error("There was an error fetching from dragonchain");
        const list = results.map((item, index) => {
            const tx = transactionList[index];
            return {
                ...item,
                dcId: (tx && tx.header.dc_id) || "",
                blockId: (tx && tx.header.block_id) || "",
                timestamp: (tx && tx.header.timestamp) || "",
            };
        });
        return { list, total };
    }
}
