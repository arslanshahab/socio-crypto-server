import { Injectable, Inject } from "@tsed/di";
import { getActionKey, getCampaignAuditKey, getAccountRecoveryAttemptKey, getSocialShareKey } from "../util/index";
import { Dragonchain } from "../clients/dragonchain";
import { TransactionType, ParticipantAction, SocialClientType } from "../util/constants";
import { BulkTransactionPayload } from "dragonchain-sdk";
import { TransactionService } from "./TransactionService";

@Injectable()
export class DragonchainService {
    private client = Dragonchain.client;
    @Inject()
    private transactionService: TransactionService;

    public async ledgerCampaignAction(data: { action: ParticipantAction; participantId: string; campaignId: string }) {
        const { action, participantId, campaignId } = data;
        const tag = getActionKey(action, participantId);
        const res = await this.client.createTransaction({
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
                type: TransactionType.SOCIAL_SHARE,
            });
        }
        return txId;
    }

    public async ledgerSocialShare(data: { socialType: SocialClientType; participantId: string }) {
        const { socialType, participantId } = data;
        const tag = getSocialShareKey(socialType, participantId);
        const res = await this.client.createTransaction({
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
        const res = await this.client.createTransaction({
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
        const res = await this.client.createTransaction({
            transactionType: TransactionType.ACCOUNT_RECOVERY,
            tag,
            payload: { identityId, accountId, username, recoveryCode, successful },
        });
        if (!res.ok) throw new Error("Failed to ledger account recovery to the Dragonchain");
        return res.response.transaction_id;
    }

    public async createBulkTransactions(list: BulkTransactionPayload[]) {
        const res = await this.client.createBulkTransaction({ transactionList: list });
        if (!res.ok) throw new Error("Failed to ledger account recovery to the Dragonchain");
        return res.response;
    }
}
