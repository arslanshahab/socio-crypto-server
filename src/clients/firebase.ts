import * as admin from 'firebase-admin';
import { Campaign } from '../models/Campaign';
import { Secrets } from '../util/secrets';

export class Firebase {
  public static client: admin.app.App;

  public static initialize() {
    Firebase.client = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: Secrets.firebaseProjectId,
        clientEmail: Secrets.firebaseClientEmail,
        privateKey: Secrets.firebasePrivateKey
      }),
    });
  }

  public static async sendCampaignCompleteNotifications(tokens: string[], campaignName: string) {
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: `Campaign ${campaignName} has been audited!`,
        body: 'Please check your Raiinmaker app for your rewards'
      },
      tokens
    };
    await Firebase.client.messaging().sendMulticast(message);
  }

  public static setClaims(userId: string, claims: any) {
    return Firebase.client.auth().setCustomUserClaims(userId, claims);
  }

  public static async sendCampaignCreatedNotifications(tokens: string[], campaign: Campaign) {
    if (tokens.length === 0) return;
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: 'New Campaign Alert!',
        body: `The campaign ${campaign.name} was created and is now live!`,
      },
      data: {
        redirection: JSON.stringify({ to: 'campaign', extraData: { campaignId: campaign.id, campaignName: campaign.name } }),
        notifyOn: new Date(campaign.beginDate).getTime().toString()
      },
      tokens
    };
    await Firebase.client.messaging().sendMulticast(message);
  }

  public static async sendKycApprovalNotification(token: string) {
    const message: admin.messaging.Message = {
      notification: {
        title: 'Your KYC has been approved!',
        body: 'You can now make withdrawals thru your Raiinmaker app'
      },
      token
    };
    await Firebase.client.messaging().send(message);
  }

  public static async sendKycRejectionNotification(token: string) {
    const message: admin.messaging.Message = {
      notification: {
        title: 'Your KYC has been rejected!',
        body: 'You may re-apply your kyc information'
      },
      token
    };
    await Firebase.client.messaging().send(message);
  }

  public static async sendWithdrawalApprovalNotification(token: string, amount: BigInt) {
    const message: admin.messaging.Message = {
      notification: {
        title: 'Your COIIN withdrawal has been Approved!',
        body: `Your request for ${amount.toString()} COIIN withdrawal is being processed`
      },
      data: { redirection: JSON.stringify({ to: 'rewards' }) },
      token
    };
    await Firebase.client.messaging().send(message);
  }

  public static async sendWithdrawalRejectionNotification(token: string, amount: BigInt) {
    const message: admin.messaging.Message = {
      notification: {
        title: 'Your COIIN withdrawal has been Rejected!',
        body: `Your request for ${amount.toString()} COIIN using has been rejected. Please attempt with a different amount`
      },
      data: { redirection: JSON.stringify({ to: 'rewards' }) },
      token
    };
    await Firebase.client.messaging().send(message);
  }
}
