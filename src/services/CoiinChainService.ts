import { Injectable } from "@tsed/di";
import { getActionKey, getSocialShareKey } from "../util/index";
import { TransactionType, ParticipantAction, SocialClientType, TransactionChainType } from "../util/constants";
import { prisma } from "../clients/prisma";
import { CoiinChain } from "../clients/coiinChain";

interface User_Participant_Campaign {
    userId: string;
    participantId: string;
    campaignId: string;
}

@Injectable()
export class CoiinChainService {
    public async ledgerCampaignAction(data: { action: ParticipantAction } & User_Participant_Campaign) {
        try {
            const { action, participantId, campaignId, userId } = data;
            const tag = getActionKey(action, participantId);
            const res = await CoiinChain.logAction({
                userId,
                tag,
                transactionType: TransactionType.TRACK_ACTION,
                payload: { action, participantId, campaignId },
            });
            console.log(res);
            // await prisma.transaction.create({
            //     data: {
            //         action,
            //         participantId,
            //         campaignId,
            //         tag,
            //         txId,
            //         chain: TransactionChainType.COIIN_CHAIN,
            //         transactionType: TransactionType.TRACK_ACTION,
            //     },
            // });
            return res;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    public async ledgerSocialShare(data: { socialType: SocialClientType } & User_Participant_Campaign) {
        try {
            const { socialType, participantId, campaignId, userId } = data;
            const tag = getSocialShareKey(socialType, participantId);
            const res = await CoiinChain.logAction({
                userId,
                tag,
                transactionType: TransactionType.SOCIAL_SHARE,
                payload: { participantId, socialType },
            });
            if (!res.ok) throw new Error(JSON.stringify(res));
            const txId = res.response.transaction_id;
            await prisma.transaction.create({
                data: {
                    socialType,
                    participantId,
                    campaignId,
                    tag,
                    txId,
                    chain: TransactionChainType.COIIN_CHAIN,
                    transactionType: TransactionType.SOCIAL_SHARE,
                },
            });
            return txId;
        } catch (error) {
            console.log(error);
            return null;
        }
    }
}
