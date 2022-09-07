import { Injectable } from "@tsed/di";
import { ParticipantAction, SocialClientType, TransactionChainType, TransactionType } from "../util/constants";
import { prisma, readPrisma } from "../clients/prisma";
import { Dragonchain } from "../clients/dragonchain";
import { Transaction } from "@prisma/client";
import { L1DragonchainTransactionAugmented } from "../types.d";

@Injectable()
export class TransactionService {
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
            data: { ...rest, chain: TransactionChainType.DRAGONCHAIN, transactionType: type },
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
        const transactionList = await Dragonchain.getBulkTransaction(results.map((item) => item.txId));
        const list = results.map((item, index) => {
            const tx = transactionList[index];
            return {
                ...item,
                dcId: (tx.ok && tx.response.header.dc_id) || "",
                blockId: (tx.ok && tx.response.header.block_id) || "",
                timestamp: (tx.ok && tx.response.header.timestamp) || "",
            };
        });
        return { list, total };
    }
}
