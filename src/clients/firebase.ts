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
}
