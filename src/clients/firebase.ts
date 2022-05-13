import BigNumber from "bignumber.js";
import * as admin from "firebase-admin";
import { Campaign } from "../models/Campaign";
import { Secrets } from "../util/secrets";
import { paginateList } from "../util";
import { RequestData, doFetch } from "../util/fetchRequest";
import { KycStatus, TransferAction } from "src/types";
import {
    KYC_NOTIFICATION_TITLE,
    KYC_NOTIFICATION_BODY,
    TRANSACTION_NOTIFICATION_TITLE,
    TRANSACTION_NOTIFICATION_BODY,
} from "../util/constants";
import { Campaign as PrismaCampaign } from "@prisma/client";

interface FirebaseUserLoginResponse {
    kind: string;
    localId: string;
    email: string;
    displayName: string;
    idToken: string;
    registered: boolean;
    refreshToken: string;
    expiresIn: string;
}

export class Firebase {
    public static adminClient: admin.app.App;
    public static baseUrl = "https://identitytoolkit.googleapis.com";

    public static initialize() {
        Firebase.adminClient = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: Secrets.firebaseProjectId,
                clientEmail: Secrets.firebaseClientEmail,
                privateKey: Secrets.firebasePrivateKey,
            }),
        });
    }

    private static async makeRequest(path: string, method: RequestData["method"], payload?: RequestData["payload"]) {
        const url = `${Firebase.baseUrl}/${path}`;
        const requestData: RequestData = {
            method,
            url,
            payload,
            query: { key: process.env.FIREBASE_API_KEY },
        };
        const response = await doFetch(requestData);
        return response.data;
    }

    public static async sendGenericNotification(tokens: string[], title: string, body: string) {
        if (tokens.length === 0) return;
        const tokenList = paginateList(tokens);
        for (let i = 0; i < tokenList.length; i++) {
            const currentTokens = tokenList[i];
            const message: admin.messaging.MulticastMessage = {
                notification: {
                    title,
                    body,
                },
                data: {
                    hello: "world",
                    title,
                    body,
                },
                apns: {
                    payload: {
                        aps: {
                            contentAvailable: true,
                            sound: "default",
                            badge: 4,
                            alert: {
                                title,
                                body,
                            },
                        },
                    },
                },
                tokens: currentTokens,
            };
            await Firebase.adminClient.messaging().sendMulticast(message);
        }
    }

    public static async sendCampaignCompleteNotifications(tokens: string[], campaignName: string) {
        if (tokens.length === 0) return;
        const title = `Campaign ${campaignName} has been audited!`;
        const body = "Please check your Raiinmaker app for your rewards";
        const tokenList = paginateList(tokens);
        for (let i = 0; i < tokenList.length; i++) {
            const currentSet = tokenList[i];
            const message: admin.messaging.MulticastMessage = {
                notification: {
                    title,
                    body,
                },
                data: {
                    title,
                    body,
                },
                apns: {
                    payload: {
                        aps: {
                            contentAvailable: true,
                            sound: "default",
                            badge: 4,
                            alert: {
                                title,
                                body,
                            },
                        },
                    },
                },
                tokens: currentSet,
            };
            await Firebase.adminClient.messaging().sendMulticast(message);
        }
    }

    public static async setCustomUserClaims(
        uid: string,
        orgName: string,
        role: "manager" | "admin",
        tempPass: boolean
    ) {
        return Firebase.adminClient.auth().setCustomUserClaims(uid, { company: orgName, role, tempPass });
    }

    public static async createSessionCookie(token: string, expiresIn: number) {
        return Firebase.adminClient.auth().createSessionCookie(token, { expiresIn });
    }

    public static async verifySessionCookie(cookie: string) {
        return Firebase.adminClient.auth().verifySessionCookie(cookie, true);
    }

    public static async verifyToken(token: string) {
        return Firebase.adminClient.auth().verifyIdToken(token, true);
    }

    public static async revokeRefreshToken(token: string) {
        return Firebase.adminClient.auth().revokeRefreshTokens(token);
    }

    public static async createNewUser(email: string, password: string) {
        return Firebase.adminClient.auth().createUser({ email, password });
    }

    public static async loginUser(email: string, password: string): Promise<FirebaseUserLoginResponse> {
        const endpoint = "/v1/accounts:signInWithPassword";
        return await Firebase.makeRequest(endpoint, "POST", { email, password, returnSecureToken: true });
    }

    public static async updateUserPassword(uid: string, password: string) {
        return Firebase.adminClient.auth().updateUser(uid, { password });
    }

    public static async getUserByEmail(email: string) {
        return Firebase.adminClient.auth().getUserByEmail(email);
    }

    public static async getUserById(id: string) {
        return Firebase.adminClient.auth().getUser(id);
    }

    public static async sendDailyParticipationUpdate(
        token: string,
        campaign: Campaign,
        coiins: BigNumber,
        participationScore: BigNumber,
        rank: number,
        totalParticipants: number
    ) {
        const title = "Daily Participation Upate";
        const body = `You have earned ${participationScore.toString()} an estimated ${coiins.toFixed(
            2
        )} Coiin rewards in the past 24 hours from ${
            campaign.name
        } Campaign. Currently you are #${rank} out of ${totalParticipants}.`;
        const message: admin.messaging.Message = {
            notification: {
                title,
                body,
            },
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true,
                        sound: "default",
                        badge: 4,
                        alert: {
                            title,
                            body,
                        },
                    },
                },
            },
            data: { title, body, redirection: JSON.stringify({ to: "harvest" }) },
            token,
        };
        await Firebase.adminClient.messaging().send(message);
    }

    public static async sendCampaignCreatedNotifications(tokens: string[], campaign: Campaign | PrismaCampaign) {
        if (tokens.length === 0) return;
        const title = "A new campaign has been created";
        const body = `The campaign ${campaign.name} was created and is now live!`;
        const tokenList = paginateList(tokens);
        for (let i = 0; i < tokenList.length; i++) {
            const currentSet = tokenList[i];
            const message: admin.messaging.MulticastMessage = {
                notification: {
                    title,
                    body,
                },
                apns: {
                    payload: {
                        aps: {
                            contentAvailable: true,
                            sound: "default",
                            badge: 4,
                            alert: {
                                title,
                                body,
                            },
                        },
                    },
                },
                data: {
                    title,
                    body,
                    redirection: JSON.stringify({
                        to: "campaign",
                        extraData: { campaignId: campaign.id, campaignName: campaign.name },
                    }),
                    notifyOn: new Date(campaign.beginDate).getTime().toString(),
                },
                tokens: currentSet,
            };
            await Firebase.adminClient.messaging().sendMulticast(message);
        }
    }

    public static async sendKycVerificationUpdate(token: string, status: KycStatus) {
        const title = KYC_NOTIFICATION_TITLE[status];
        const body = KYC_NOTIFICATION_BODY[status];
        const message: admin.messaging.Message = {
            notification: {
                title,
                body,
            },
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true,
                        sound: "default",
                        badge: 4,
                        alert: {
                            title,
                            body,
                        },
                    },
                },
            },
            data: { title, body, redirection: JSON.stringify({ to: "harvest" }) },
            token,
        };
        await Firebase.adminClient.messaging().send(message);
    }

    public static async sendUserTransactionUpdate(token: string, status: TransferAction) {
        const title = TRANSACTION_NOTIFICATION_TITLE[status];
        const body = TRANSACTION_NOTIFICATION_BODY[status];
        const message: admin.messaging.Message = {
            notification: {
                title,
                body,
            },
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true,
                        sound: "default",
                        badge: 4,
                        alert: {
                            title,
                            body,
                        },
                    },
                },
            },
            data: { title, body, redirection: JSON.stringify({ to: "harvest" }) },
            token,
        };
        await Firebase.adminClient.messaging().send(message);
    }

    public static async sendKycApprovalNotification(token: string) {
        const title = "Your KYC has been approved!";
        const body = "You can now make withdrawals thru your Raiinmaker app";
        const message: admin.messaging.Message = {
            notification: {
                title,
                body,
            },
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true,
                        sound: "default",
                        badge: 4,
                        alert: {
                            title,
                            body,
                        },
                    },
                },
            },
            data: { title, body, redirection: JSON.stringify({ to: "harvest" }) },
            token,
        };
        await Firebase.adminClient.messaging().send(message);
    }

    public static async sendKycRejectionNotification(token: string) {
        const title = "Your KYC has been rejected!";
        const body = "You may re-apply your kyc information";
        const message: admin.messaging.Message = {
            notification: {
                title,
                body,
            },
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true,
                        sound: "default",
                        badge: 4,
                        alert: {
                            title,
                            body,
                        },
                    },
                },
            },
            data: { title, body, redirection: JSON.stringify({ to: "settings" }) },
            token,
        };
        await Firebase.adminClient.messaging().send(message);
    }

    public static async sendWithdrawalApprovalNotification(token: string, amount: BigInt, symbol: String = "COIIN") {
        const title = "Your withdraw request has been approved";
        const body = `Your request for ${amount.toString()} ${symbol.toUpperCase()} withdrawal is being processed`;
        const message: admin.messaging.Message = {
            notification: {
                title,
                body,
            },
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true,
                        sound: "default",
                        badge: 4,
                        alert: {
                            title,
                            body,
                        },
                    },
                },
            },
            data: { title, body, redirection: JSON.stringify({ to: "rewards" }) },
            token,
        };
        await Firebase.adminClient.messaging().send(message);
    }

    public static async sendWithdrawalRejectionNotification(token: string, amount: BigInt, symbol: string = "COIIN") {
        const title = "Your withdraw request has been rejected";
        const body = `Your request for ${amount.toString()} ${symbol.toUpperCase()} using has been rejected. Please attempt with a different amount`;
        const message: admin.messaging.Message = {
            notification: {
                title,
                body,
            },
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true,
                        sound: "default",
                        badge: 4,
                        alert: {
                            title,
                            body,
                        },
                    },
                },
            },
            data: { title, body, redirection: JSON.stringify({ to: "settings" }) },
            token,
        };
        await Firebase.adminClient.messaging().send(message);
    }
}
