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

  public static async sendCampaignCompleteNotifications(tokens: string[], campaignName: string) {
    if (tokens.length === 0) return;
    const tokenList = paginateList(tokens);
    for (let i = 0; i < tokenList.length; i++) {
      const currentSet = tokenList[i];
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: `Campaign ${campaignName} has been audited!`,
          body: 'Please check your Raiinmaker app for your rewards'
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: `Campaign ${campaignName} has been audited!`,
                body: 'Please check your Raiinmaker app for your rewards'
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

  public static async sendDailyParticipationUpdate(token: string, campaign: Campaign, coiins: BigNumber, participationScore: BigNumber, rank: number, totalParticipants: number) {
    const message: admin.messaging.Message = {
      notification: {
        title: 'Daily Participation Upate',
        body: `You have earned ${participationScore.toString()} an estimated ${coiins.toFixed(2)} Coiin rewards in the past 24 hours from ${campaign.name} Campaign. Currently you are #${rank} out of ${totalParticipants}.`
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: 'Daily Participation Upate',
              body: `You have earned ${participationScore.toString()} an estimated ${coiins.toFixed(2)} Coiin rewards in the past 24 hours from ${campaign.name} Campaign. Currently you are #${rank} out of ${totalParticipants}.`
            }
          }
        }
      },
      data: { redirection: JSON.stringify({ to: 'harvest' }) },
      token
    };
    await Firebase.client.messaging().send(message);
  }

  public static async sendCampaignCreatedNotifications(tokens: string[], campaign: Campaign) {
    if (tokens.length === 0) return;
    const tokenList = paginateList(tokens);
    for (let i = 0; i < tokenList.length; i++) {
      const currentSet = tokenList[i];
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: 'A new campaign has been created',
          body: `The campaign ${campaign.name} was created and is now live!`,
        },
        apns: {
          payload: {
            aps: {
              title: 'A new campaign has been created',
              body: `The campaign ${campaign.name} was created and is now live!`,
            }
          }
        },
        data: {
          redirection: JSON.stringify({ to: 'campaign', extraData: { campaignId: campaign.id, campaignName: campaign.name } }),
          notifyOn: new Date(campaign.beginDate).getTime().toString()
        },
        tokens: currentSet
      };
      await Firebase.client.messaging().sendMulticast(message);
    }
  }

  public static async sendKycApprovalNotification(token: string) {
    const message: admin.messaging.Message = {
      notification: {
        title: 'Your KYC has been approved!',
        body: 'You can now make withdrawals thru your Raiinmaker app'
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: 'Your KYC has been approved!',
              body: 'You can now make withdrawals thru your Raiinmaker app'
            }
          }
        }
      },
      data: { redirection: JSON.stringify({ to: 'harvest' }) },
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
      apns: {
        payload: {
          aps: {
            alert: {
              title: 'Your KYC has been rejected!',
              body: 'You may re-apply your kyc information'
            }
          }
        }
      },
      data: { redirection: JSON.stringify({ to: 'settings' }) },
      token
    };
    await Firebase.client.messaging().send(message);
  }

  public static async sendWithdrawalApprovalNotification(token: string, amount: BigInt) {
    const message: admin.messaging.Message = {
      notification: {
        title: 'Your withdraw request has been approved',
        body: `Your request for ${amount.toString()} COIIN withdrawal is being processed`
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: 'Your withdraw request has been approved',
              body: `Your request for ${amount.toString()} COIIN withdrawal is being processed`
            }
          }
        }
      },
      data: { redirection: JSON.stringify({ to: 'rewards' }) },
      token
    };
    await Firebase.client.messaging().send(message);
  }

  public static async sendWithdrawalRejectionNotification(token: string, amount: BigInt) {
    const message: admin.messaging.Message = {
      notification: {
        title: 'Your withdraw request has been rejected',
        body: `Your request for ${amount.toString()} COIIN using has been rejected. Please attempt with a different amount`
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: 'Your withdraw request has been rejected',
              body: `Your request for ${amount.toString()} COIIN using has been rejected. Please attempt with a different amount`
            }
          }
        }
      },
      data: { redirection: JSON.stringify({ to: 'settings' }) },
      token
    };
    await Firebase.client.messaging().send(message);
  }
}
