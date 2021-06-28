import { Secrets } from "../util/secrets";
import { S3Client } from "./s3";
import { doFetch } from "../util/fetchRequest";

const { NODE_ENV = "development" } = process.env;

export class Xoxoday {
    public static baseUrl =
        NODE_ENV === "production" ? "https://accounts.xoxoday.com/chef" : " https://stagingaccount.xoxoday.com/chef";
    public static clientID = Secrets.xoxodayClientID;
    public static clientSecret = Secrets.xoxodayClientSecret;
    public static redirectURI = "https://raiinmaker.com/";

    public static async getAccessToken(code: String) {
        const payload = {
            grant_type: "authorization_code",
            code: code,
            redirect_uri: this.redirectURI,
            client_id: process.env.XOXODAY_CLIENT_ID,
            client_secret: process.env.XOXODAY_CLIENT_SECRET,
        };
        const response = await doFetch(`${this.baseUrl}/v1/oauth/token/user`, "POST", payload);
        const authData = await response.json();
        // if (authData.error) throw new Error("Code expired");
        const s3Resp = await S3Client.refreshXoxodayAuthData(authData);
        console.log(s3Resp);
        return authData;
    }
}
