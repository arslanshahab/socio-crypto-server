import { Injectable } from "@tsed/di";
import { ParticipantAction, SocialClientType, TransactionChainType, TransactionType } from "../util/constants";
import { prisma, readPrisma } from "../clients/prisma";
import { Dragonchain } from "../clients/dragonchain";

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

    public async getPaginatedUserTransactions(data: { take: number; skip: number; userId: string }) {
        const { userId, take, skip } = data;
        const userParticipations = await prisma.participant.findMany({ where: { userId } });
        const participationIds = userParticipations.map((item) => item.id);
        const [results, total] = await readPrisma.$transaction([
            readPrisma.transaction.findMany({
                where: { participantId: { in: participationIds } },
                take,
                skip,
                orderBy: { createdAt: "desc" },
            }),
            readPrisma.transaction.count({ where: { participantId: { in: participationIds } } }),
        ]);
        const promiseArray: Promise<any>[] = [];
        for (const tx of results) {
            promiseArray.push(Dragonchain.getTransaction(tx.txId));
        }
        const resp = await Promise.all(promiseArray);
        console.log(resp);
        return { results, total };
    }
}
