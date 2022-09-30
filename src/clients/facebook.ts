import { SocialLink } from "@prisma/client";
import { FacebookGraphApi } from "./facebookApi";

export class FacebookClient {
    public static getClient(accessToken: string) {
        return new FacebookGraphApi(accessToken);
    }

    public static post = async () => {};
    public static postV2 = async () => {};

    public static async getPageData(accessToken: string) {
        const payload: { [key: string]: number } = {};
        const client = FacebookClient.getClient(accessToken);
        const data = await client.get(`v8.0/me`, {
            fields: ["friends"],
        });
        payload.friends = data["friends"]["summary"]["total_count"];
        return payload;
    }

    public static getPost = async (socialLink: SocialLink, id: string, cached = true) => {};
    public static getUsernameV2 = async () => {};
}
