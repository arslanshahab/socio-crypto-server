import * as admin from 'firebase-admin';
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

  public static async sendKycApprovalNotification(token: string) {
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: 'Your KYC has been approved!',
        body: 'You can now make withdrawals thru your Raiinmaker app'
      },
      tokens: [token]
    };
    await Firebase.client.messaging().sendMulticast(message);
  }

  public static async sendKycRejectionNotification(token: string) {
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: 'Your KYC has been rejected!',
        body: 'You may re-apply your kyc information'
      },
      tokens: [token]
    };
    await Firebase.client.messaging().sendMulticast(message);
  }
}
