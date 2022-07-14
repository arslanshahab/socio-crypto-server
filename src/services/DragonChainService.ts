import { Injectable } from "@tsed/di";
import { getActionKey, getCampaignAuditKey, getAccountRecoveryAttemptKey, getSocialShareKey } from "../util/index";
import { Dragonchain } from "../clients/dragonchain";
import { TransactionType, ParticipantAction, SocialClientType } from "../util/constants";

@Injectable()
export class DragonChainService {
    private client = Dragonchain.client;

    public async ledgerCampaignAction(data: { action: ParticipantAction; participantId: string; campaignId: string }) {
        const { action, participantId, campaignId } = data;
        const tag = getActionKey(action, participantId);
        const res = await this.client.createTransaction({
            transactionType: TransactionType.TRACK_ACTION,
            tag,
            payload: { action, participantId, campaignId },
        });
        if (!res.ok) throw new Error("Failed to ledger action to the Dragonchain");
        return res.response.transaction_id;
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
        return res.response.transaction_id;
    }

    public async ledgerCoiinCampaignAudit(
        payouts: { [key: string]: number },
        rejectedUsers: string[],
        campaignId: string
    ) {
        const tag = getCampaignAuditKey(campaignId);
        const res = await this.client.createTransaction({
            transactionType: TransactionType.CAMPAIGN_AUDIT,
            tag,
            payload: { payouts, rejectedUsers },
        });
        if (!res.ok) throw new Error("Failed to ledger campaign audit to the Dragonchain");
        return res.response.transaction_id;
    }

    public async ledgerRaffleCampaignAudit(
        prizes: { [key: string]: string },
        rejectedUsers: string[],
        campaignId: string
    ) {
        const tag = getCampaignAuditKey(campaignId);
        const res = await this.client.createTransaction({
            transactionType: TransactionType.CAMPAIGN_AUDIT,
            tag,
            payload: { prizes, rejectedUsers },
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
}
