import { createClient, DragonchainClient } from 'dragonchain-sdk';
import { Secrets } from '../util/secrets';

const transactionTypes = ['campaign','trackAction'];
const getActionKey = (action: string, participantId: string) => `${participantId.replace(/-/g, ':')}-${action}`;

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
}