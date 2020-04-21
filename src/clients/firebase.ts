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
      notification: { title: `Campaign ${campaignName} has been audited!`, body: 'Please check your Raiinmaker app for your rewards' },
      tokens
    };
    const response = await Firebase.client.messaging().sendMulticast(message);
    console.log(response);
  }
}
