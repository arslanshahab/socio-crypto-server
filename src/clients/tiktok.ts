import { Participant } from "../models/Participant";
import FormData from "form-data";
import fs from "fs";
import { doFetch, RequestData } from "../util/fetchRequest";
import { SocialLink } from "../models/SocialLink";
import { Secrets } from "../util/secrets";
import { TiktokLinkCredentials } from "src/types";

export class TikTokClient {
    public static baseUrl = "https://open-api.tiktok.com";

    public static fetchTokens = async (code: string) => {
        const requestData: RequestData = {
            url: `${TikTokClient.baseUrl}/oauth/access_token/`,
            method: "post",
            query: {
                client_key: Secrets.tiktokClientKey,
                client_secret: Secrets.tiktokClientSecret,
                grant_type: "authorization_code",
                code,
            },
        };
        return await doFetch(requestData);
    };

    public static refreshTokens = async (refreshToken: string) => {
        const requestData: RequestData = {
            url: `${TikTokClient.baseUrl}/oauth/refresh_token/`,
            method: "post",
            query: {
                client_key: Secrets.tiktokClientKey,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            },
        };
        return await doFetch(requestData);
    };

    public static post = async (
        participant: Participant,
        socialLink: SocialLink,
        text: string,
        data: string,
        mediaType: "photo" | "video" | "gif",
        mediaFormat: string
    ): Promise<string> => {
        const fileName = `raiinmaker-${participant.id}.${mediaFormat.split("/")[1]}`;
        const directory = process.env.NODE_ENV === "development" ? "./src/clients/uploads" : "./dist/clients/uploads";
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }
        const filePath = `${directory}/${fileName}`;
        try {
            console.log("UPLOAD-TIKTOK FILE: ", fileName);
            var bitmap = Buffer.from(data, "base64");
            fs.writeFileSync(filePath, bitmap);
            const formData = new FormData();
            formData.append("video", fs.createReadStream(filePath));
            const credentials = await TikTokClient.getTokens(socialLink);
            const requestData: RequestData = {
                url: `${TikTokClient.baseUrl}/share/video/upload`,
                method: "POST",
                query: { open_id: credentials.open_id, access_token: credentials.access_token },
                headers: formData.getHeaders(),
            };
            const resp = await doFetch(requestData);
            console.log(resp);
            if (!resp?.data?.share_id) throw new Error("There was an error uploading file to tiktok");
            fs.unlinkSync(filePath);
            return resp?.data?.share_id;
        } catch (error) {
            console.log(error);
            fs.unlinkSync(filePath);
            throw new Error("There was an error uploading content to tiktok.");
        }
    };

    public static getPosts = async (socialLink: SocialLink, sharedIds: string[]) => {
        const credentials = await TikTokClient.getTokens(socialLink);
        const requestData: RequestData = {
            url: `${TikTokClient.baseUrl}/video/query/`,
            method: "POST",
            payload: {
                open_id: credentials.open_id,
                access_token: credentials.access_token,
                filters: {
                    video_ids: sharedIds,
                },
                fields: [
                    "embed_html",
                    "embed_link",
                    "like_count",
                    "comment_count",
                    "share_count",
                    "view_count",
                    "title",
                ],
            },
        };
        const videoQueryRes = await doFetch(requestData);
        if (!videoQueryRes?.data?.videos) throw new Error("There was an error fetching videos from tiktok.");
        return videoQueryRes.data.videos;
    };

    public static getUserData = async (socialLink: SocialLink) => {
        const credentials = await TikTokClient.getTokens(socialLink);
        const requestData: RequestData = {
            url: `${TikTokClient.baseUrl}/user/info/`,
            method: "POST",
            payload: {
                open_id: credentials.open_id,
                access_token: credentials.access_token,
                fields: ["open_id", "union_id", "avatar_url", "display_name"],
            },
        };
        const userInfo = await doFetch(requestData);
        if (!userInfo || !userInfo.data) throw new Error("There was an error fetching user data from tiktok.");
        return userInfo.data.user;
    };

    private static getTokens = async (socialLink: SocialLink): Promise<TiktokLinkCredentials> => {
        let credentials = socialLink.getTiktokCreds();
        if (credentials.expires_in.isLessThan(new Date().getTime())) {
            const tokens = await TikTokClient.refreshTokens(credentials.refresh_token);
            console.log("tokens", tokens);
            console.log("user", socialLink.user);
            await SocialLink.addOrUpdateTiktokLink(socialLink.user, tokens.data);
            credentials = socialLink.getTiktokCreds();
        }
        return credentials;
    };
    public static getFolowers = async () => {
        return 1;
    };
}
