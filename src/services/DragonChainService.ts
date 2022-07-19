import { Injectable, Inject } from "@tsed/di";
import { getActionKey, getCampaignAuditKey, getAccountRecoveryAttemptKey, getSocialShareKey } from "../util/index";
import { Dragonchain } from "../clients/dragonchain";
import { TransactionType, ParticipantAction, SocialClientType, TransactionChainType } from "../util/constants";
import { TransactionService } from "./TransactionService";
import { DragonchainCampaignLedgerPayload } from "../types.d";
import { BulkTransactionPayload } from "dragonchain-sdk";
import { Transaction, PrismaPromise } from "@prisma/client";
import { prisma } from "../clients/prisma";

@Injectable()
export class DragonchainService {
    @Inject()
    private transactionService: TransactionService;

    public async ledgerCampaignAction(data: { action: ParticipantAction; participantId: string; campaignId: string }) {
        const { action, participantId, campaignId } = data;
        const tag = getActionKey(action, participantId);
        const res = await Dragonchain.client.createTransaction({
            transactionType: TransactionType.TRACK_ACTION,
            tag,
            payload: { action, participantId, campaignId },
        });
        if (!res.ok) throw new Error("Failed to ledger action to the Dragonchain");
        const txId = res.response.transaction_id;
        if (this.transactionService) {
            await this.transactionService.saveDragonchainTransaction({
                participantId,
                action,
                tag,
                txId,
                type: TransactionType.TRACK_ACTION,
            });
        }
        return txId;
    }

    public async ledgerSocialShare(data: { socialType: SocialClientType; participantId: string }) {
        const { socialType, participantId } = data;
        const tag = getSocialShareKey(socialType, participantId);
        const res = await Dragonchain.client.createTransaction({
            transactionType: TransactionType.SOCIAL_SHARE,
            tag,
            payload: { participantId, socialType },
        });
        if (!res.ok) throw new Error("Failed to ledger action to the Dragonchain");
        const txId = res.response.transaction_id;
        if (this.transactionService) {
            await this.transactionService.saveDragonchainTransaction({
                participantId,
                socialType,
                tag,
                txId,
                type: TransactionType.SOCIAL_SHARE,
            });
        }
        return txId;
    }

    public async ledgerCampaignAudit(payouts: { [key: string]: number }, campaignId: string) {
        const tag = getCampaignAuditKey(campaignId);
        const res = await Dragonchain.client.createTransaction({
            transactionType: TransactionType.CAMPAIGN_AUDIT,
            tag,
            payload: { payouts },
        });
        if (!res.ok) throw new Error("Failed to ledger campaign audit to the Dragonchain");
        return res.response.transaction_id;
    }

    public async ledgerAccountRecoveryAttempt(
        accountId: string | undefined,
        identityId: string,
        username: string,
        recoveryCode: number,
        successful: boolean
    ) {
        const tag = getAccountRecoveryAttemptKey(accountId, username);
        const res = await Dragonchain.client.createTransaction({
            transactionType: TransactionType.ACCOUNT_RECOVERY,
            tag,
            payload: { identityId, accountId, username, recoveryCode, successful },
        });
        if (!res.ok) throw new Error("Failed to ledger account recovery to the Dragonchain");
        return res.response.transaction_id;
    }

    public async ledgerBulkCampaignAction(data: DragonchainCampaignLedgerPayload[]) {
        const bulkPayload: BulkTransactionPayload[] = [];
        const prismaTransactions: PrismaPromise<Transaction>[] = [];
        for (const item of data) {
            const { action, participantId, campaignId, payload, socialType } = item;
            const tag = getActionKey(action, participantId);
            bulkPayload.push({
                transactionType: TransactionType.TRACK_ACTION,
                tag,
                payload: { ...payload, participantId, campaignId, action, socialType },
            });
        }
        const res = await Dragonchain.client.createBulkTransaction({ transactionList: bulkPayload });
        if (!res.ok) throw new Error("Failed to ledger bulk campaign actions to the Dragonchain");
        const success = res.response[201];
        const failed = res.response[400];
        for (let index = 0; index < bulkPayload.length; index++) {
            const bulkData = bulkPayload[index];
            const dataItem = data[index];
            const txId = success[index].toString();
            if (failed.length && failed.find((f) => f.tag === bulkData.tag)) continue;
            prismaTransactions.push(
                prisma.transaction.create({
                    data: {
                        participantId: dataItem.participantId,
                        action: dataItem.action,
                        tag: bulkData.tag!,
                        txId,
                        transactionType: TransactionType.TRACK_ACTION,
                        socialType: dataItem.socialType,
                        chain: TransactionChainType.DRAGONCHAIN,
                    },
                })
            );
        }
        await prisma.$transaction(prismaTransactions);
        return { success, failed };
    }
}
