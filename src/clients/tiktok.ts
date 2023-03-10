import { Participant } from "../models/Participant";
import FormData from "form-data";
import fs from "fs";
import { doFetch, RequestData } from "../util/fetchRequest";
import { SocialLink } from "../models/SocialLink";
import { Secrets } from "../util/secrets";
import { TiktokLinkCredentials } from "types.d.ts";
import path from "path";
import { SocialLink as PrismaSocialLink } from "@prisma/client";

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
        console.log("TIKTOK-TOKENS-REQUEST:", requestData);
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
        console.log("TIKTOK-TOKENS-REFRESH-REQUEST:", requestData);
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
        const filePath = `${path.resolve(__dirname, "./uploads")}/${fileName}`;
        try {
            console.log("UPLOAD-TIKTOK FILE -:)", fileName, filePath);
            var bitmap = Buffer.from(data, "base64");
            fs.writeFileSync(filePath, bitmap);
            const formData = new FormData({
                maxDataSize: Infinity,
            });
            const file = fs.createReadStream(path.resolve(__dirname, filePath));
            formData.append("video", file);
            const credentials = await TikTokClient.getTokens(socialLink);
            const requestData: RequestData = {
                url: `${TikTokClient.baseUrl}/share/video/upload`,
                method: "POST",
                query: { open_id: credentials.open_id, access_token: credentials.access_token },
                headers: formData.getHeaders(),
                payload: formData,
            };
            const resp = await doFetch(requestData);
            if (!resp?.data?.share_id) throw new Error("There was an error uploading file to tiktok");
            fs.unlinkSync(filePath);
            return resp?.data?.share_id;
        } catch (error) {
            console.log(error);
            fs.unlinkSync(filePath);
            throw new Error("There was an error uploading content to tiktok.");
        }
    };

    public static postV2 = async () => {};

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

    public static getPost = async (socialLink: PrismaSocialLink, id: string, cached = true) => {
        return "There is no post found on tiktok";
    };

    public static getUsernameV2 = async () => {};
}
