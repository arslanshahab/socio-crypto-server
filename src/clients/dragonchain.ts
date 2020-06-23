import { createClient, DragonchainClient } from 'dragonchain-sdk';
import { Secrets } from '../util/secrets';

const transactionTypes = ['campaign','trackAction','campaignAudit','accountRecovery'];
const getActionKey = (action: string, participantId: string) => `${participantId.replace(/-/g, ':')}-${action}`;
const getCampaignAuditKey = (campaignId: string) => campaignId.replace(/-/g, ':');

const getAccountRecoveryAttemptKey = (accountId: string|undefined, username: string) => `${accountId ? accountId.replace(/-/g, ':') + ':' : ''}${username.replace(/-/g, ':')}`;

export class Dragonchain {
  public static client: DragonchainClient;

  public static async initialize() {
    this.client = await createClient({
      dragonchainId: Secrets.dragonchainId,
      endpoint: Secrets.dragonchainEndpoint,
      authKeyId: Secrets.dragonchainApiKeyId,
      authKey: Secrets.dragonchainApiKey,
    });
    const { ok, response } = await this.client.listTransactionTypes();
    if (!ok) throw new Error('Error listing transaction types');
    const { transaction_types: registeredTransactionTypes } = response;
    for (let i = 0; i < transactionTypes.length; i++) {
      if (!registeredTransactionTypes.find(type => type.txn_type === transactionTypes[i])) {
        await this.client.createTransactionType({ transactionType: transactionTypes[i] });
      }
    }
  }

  public static async ledgerCampaignAction(action: 'click'|'view'|'submission', participantId: string, campaignId: string) {
    const tag = getActionKey(action, participantId);
    const res = await this.client.createTransaction({ transactionType: 'trackAction', tag, payload: { action, participantId, campaignId } });
    if (!res.ok) throw new Error('Failed to ledger action to the Dragonchain');
    return res.response.transaction_id;
  }

  public static async ledgerCampaignAudit(payouts: {[key: string]: number}, rejectedUsers: string[], campaignId: string) {
    const tag = getCampaignAuditKey(campaignId);
    const res = await this.client.createTransaction({ transactionType: 'campaignAudit', tag, payload: { payouts, rejectedUsers } });
    if (!res.ok) throw new Error('Failed to ledger campaign audit to the Dragonchain');
    return res.response.transaction_id;
  }

  public static async ledgerAccountRecoveryAttempt(accountId: string|undefined, identityId: string, username: string, recoveryCode: number, successful: boolean) {
    const tag = getAccountRecoveryAttemptKey(accountId, username);
    const res = await this.client.createTransaction({ transactionType: 'accountRecovery', tag, payload: { identityId, accountId, username, recoveryCode, successful } });
    console.log(res.response);
    if (!res.ok) throw new Error('Failed to ledger account recovery to the Dragonchain');
    return res.response.transaction_id;
  }
}