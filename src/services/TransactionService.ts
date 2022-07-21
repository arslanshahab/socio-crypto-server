import { Injectable } from "@tsed/di";
import { ParticipantAction, SocialClientType, TransactionChainType, TransactionType } from "../util/constants";
import { prisma } from "../clients/prisma";

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
}
