import BigNumber from 'bignumber.js';
import * as admin from 'firebase-admin';
import { Campaign } from '../models/Campaign';
import { Secrets } from '../util/secrets';
import { paginateList } from '../util/helpers';

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

  public static async sendGenericNotification(tokens: string[], title: string, body: string) {
    if (tokens.length === 0) return;
    const tokenList = paginateList(tokens);
    for (let i = 0; i < tokenList.length; i++) {
      const currentTokens = tokenList[i];
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body
        },
        data: {
          'hello': 'world',
          title,
          body
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: "default",
              badge: 4,
              alert: {
                title,
                body
              }
            }
          }
        },
        tokens: currentTokens
      };
      await Firebase.client.messaging().sendMulticast(message);
    }
  }

  public static async sendCampaignCompleteNotifications(tokens: string[], campaignName: string) {
    if (tokens.length === 0) return;
    const title = `Campaign ${campaignName} has been audited!`;
    const body = 'Please check your Raiinmaker app for your rewards';
    const tokenList = paginateList(tokens);
    for (let i = 0; i < tokenList.length; i++) {
      const currentSet = tokenList[i];
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body
        },
        data: {
          title,
          body
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: "default",
              badge: 4,
              alert: {
                title,
                body
              }
            }
          }
        },
        tokens: currentSet
      };
      await Firebase.client.messaging().sendMulticast(message);
    }
  }

  public static async setCustomUserClaims(uid: string, orgName: string, role: 'manager' | 'admin', tempPass: boolean) {
    return Firebase.client.auth().setCustomUserClaims(uid, {company: orgName, role, tempPass})
  }

  public static async createSessionCookie(token: string, expiresIn: number) {
    return Firebase.client.auth().createSessionCookie(token, {expiresIn});
  }

  public static async verifySessionCookie(cookie: string) {
    return Firebase.client.auth().verifySessionCookie(cookie, true);
  }

  public static async verifyToken(token: string) {
    return Firebase.client.auth().verifyIdToken(token, true);
  }

  public static async revokeRefreshToken(token: string) {
    return Firebase.client.auth().revokeRefreshTokens(token);
  }

  public static async createNewUser(email: string, password: string) {
    return Firebase.client.auth().createUser({email, password})
  }

  public static async updateUserPassword(uid: string, password: string) {
    return Firebase.client.auth().updateUser(uid, {password})
  }

  public static async getUser(email: string) {
    return Firebase.client.auth().getUserByEmail(email);
  }

  public static async sendDailyParticipationUpdate(token: string, campaign: Campaign, coiins: BigNumber, participationScore: BigNumber, rank: number, totalParticipants: number) {
    const title = 'Daily Participation Upate';
    const body = `You have earned ${participationScore.toString()} an estimated ${coiins.toFixed(2)} Coiin rewards in the past 24 hours from ${campaign.name} Campaign. Currently you are #${rank} out of ${totalParticipants}.`;
    const message: admin.messaging.Message = {
      notification: {
        title,
        body
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: "default",
            badge: 4,
            alert: {
              title,
              body
            }
          }
        }
      },
      data: {title, body, redirection: JSON.stringify({to: 'harvest'})},
      token
    };
    await Firebase.client.messaging().send(message);
  }

  public static async sendCampaignCreatedNotifications(tokens: string[], campaign: Campaign) {
    if (tokens.length === 0) return;
    const title = 'A new campaign has been created';
    const body = `The campaign ${campaign.name} was created and is now live!`;
    const tokenList = paginateList(tokens);
    for (let i = 0; i < tokenList.length; i++) {
      const currentSet = tokenList[i];
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: "default",
              badge: 4,
              alert: {
                title,
                body
              }
            }
          }
        },
        data: {
          title,
          body,
          redirection: JSON.stringify({
            to: 'campaign',
            extraData: {campaignId: campaign.id, campaignName: campaign.name}
          }),
          notifyOn: new Date(campaign.beginDate).getTime().toString()
        },
        tokens: currentSet
      };
      await Firebase.client.messaging().sendMulticast(message);
    }
  }

  public static async sendKycApprovalNotification(token: string) {
    const title = 'Your KYC has been approved!';
    const body = 'You can now make withdrawals thru your Raiinmaker app';
    const message: admin.messaging.Message = {
      notification: {
        title,
        body
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: "default",
            badge: 4,
            alert: {
              title,
              body
            }
          }
        }
      },
      data: {title, body, redirection: JSON.stringify({to: 'harvest'})},
      token
    };
    await Firebase.client.messaging().send(message);
  }

  public static async sendKycRejectionNotification(token: string) {
    const title = 'Your KYC has been rejected!';
    const body = 'You may re-apply your kyc information';
    const message: admin.messaging.Message = {
      notification: {
        title,
        body
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: "default",
            badge: 4,
            alert: {
              title,
              body
            }
          }
        }
      },
      data: {title, body, redirection: JSON.stringify({to: 'settings'})},
      token
    };
    await Firebase.client.messaging().send(message);
  }

  public static async sendWithdrawalApprovalNotification(token: string, amount: BigInt) {
    const title = 'Your withdraw request has been approved';
    const body = `Your request for ${amount.toString()} COIIN withdrawal is being processed`;
    const message: admin.messaging.Message = {
      notification: {
        title,
        body
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: "default",
            badge: 4,
            alert: {
              title,
              body
            }
          }
        }
      },
      data: {title, body, redirection: JSON.stringify({to: 'rewards'})},
      token
    };
    await Firebase.client.messaging().send(message);
  }

  public static async sendWithdrawalRejectionNotification(token: string, amount: BigInt) {
    const title = 'Your withdraw request has been rejected';
    const body = `Your request for ${amount.toString()} COIIN using has been rejected. Please attempt with a different amount`;
    const message: admin.messaging.Message = {
      notification: {
        title,
        body
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: "default",
            badge: 4,
            alert: {
              title,
              body
            }
          }
        }
      },
      data: {title, body, redirection: JSON.stringify({to: 'settings'})},
      token
    };
    await Firebase.client.messaging().send(message);
  }
}
