import { FacebookGraphApi } from "./facebookApi";

export class FacebookClient {
    public static getClient(accessToken: string) {
        return new FacebookGraphApi(accessToken);
    }

    public static async getPageData(accessToken: string) {
        const payload: { [key: string]: any } = {};
        const client = FacebookClient.getClient(accessToken);
        const data = await client.get(`v8.0/me`, {
            fields: ["friends"],
        });
        payload.friends = data["friends"]["summary"]["total_count"];
        return payload;
    }
}
