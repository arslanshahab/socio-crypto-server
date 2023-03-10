import * as admin from "firebase-admin";
import { Secrets } from "../util/secrets";
import { RequestData, doFetch } from "../util/fetchRequest";

export interface FirebaseUserLoginResponse {
    kind: string;
    localId: string;
    email: string;
    displayName: string;
    idToken: string;
    registered: boolean;
    refreshToken: string;
    expiresIn: string;
}

export class FirebaseAdmin {
    public static adminClient: admin.app.App;
    public static baseUrl = "https://identitytoolkit.googleapis.com";

    public static initialize() {
        FirebaseAdmin.adminClient = admin.initializeApp(
            {
                credential: admin.credential.cert({
                    projectId: Secrets.firebaseAdminProjectId,
                    clientEmail: Secrets.firebaseAdminClientEmail,
                    privateKey: Secrets.firebaseAdminPrivateKey,
                }),
            },
            "AdminFirebase"
        );
    }

    public static async setCustomUserClaims(
        uid: string,
        orgName: string,
        role: "manager" | "admin",
        tempPass: boolean
    ) {
        return FirebaseAdmin.adminClient.auth().setCustomUserClaims(uid, { company: orgName, role, tempPass });
    }

    public static async deleteUser(uid: string) {
        return FirebaseAdmin.adminClient.auth().deleteUser(uid);
    }

    public static async createSessionCookie(token: string, expiresIn: number) {
        return FirebaseAdmin.adminClient.auth().createSessionCookie(token, { expiresIn });
    }

    public static async verifySessionCookie(cookie: string) {
        return FirebaseAdmin.adminClient.auth().verifySessionCookie(cookie, true);
    }

    public static async verifyToken(token: string) {
        return FirebaseAdmin.adminClient.auth().verifyIdToken(token, true);
    }

    public static async revokeRefreshToken(token: string) {
        return FirebaseAdmin.adminClient.auth().revokeRefreshTokens(token);
    }

    public static async createNewUser(email: string, password: string) {
        return FirebaseAdmin.adminClient.auth().createUser({ email, password });
    }

    public static async loginUser(email: string, password: string): Promise<FirebaseUserLoginResponse> {
        const url = `${FirebaseAdmin.baseUrl}/v1/accounts:signInWithPassword`;
        const requestData: RequestData = {
            method: "POST",
            url,
            payload: {
                email,
                password,
                returnSecureToken: true,
            },
            query: { key: process.env.FIREBASE_ADMIN_API_KEY },
        };
        return await doFetch(requestData);
    }

    public static async updateUserPassword(uid: string, password: string) {
        return FirebaseAdmin.adminClient.auth().updateUser(uid, { password });
    }

    public static async getUserByEmail(email: string) {
        return FirebaseAdmin.adminClient.auth().getUserByEmail(email);
    }

    public static async getUserById(id: string) {
        return FirebaseAdmin.adminClient.auth().getUser(id);
    }

    public static async listUsers() {
        return FirebaseAdmin.adminClient.auth().listUsers();
    }

    public static async deleteUsers(ids: string[]) {
        return FirebaseAdmin.adminClient.auth().deleteUsers(ids);
    }
}
