import { Participant } from "../models/Participant";
import FormData from "form-data";
import fs from "fs";
import { doFetch, RequestData } from "../util/fetchRequest";
import { Secrets } from "../util/secrets";
import { SocialLink } from "../models/SocialLink";
import { SocialPost } from "../models/SocialPost";

// https://open-api.tiktok.com/platform/oauth/connect/?client_key=awtv37zowsh2ryq2&scope=user.info.basic,video.list&response_type=code&redirect_uri=https://raiinmaker.loca.lt/&state=1234567890

export class TikTokClient {
    public static baseUrl = "https://open-api.tiktok.com";

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
            const credentials = socialLink.getTiktokCreds();
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
    public static tiktokVideoList = async (socialLink: SocialLink, userId: string) => {
        // const credentials = socialLink.getTiktokCreds();
        const access_token = "act.621458c1fbb562cd239b4752886c250bbXxPe0voWPtRq50lhfr75D9o23T9";
        const open_id = "a509c4e1-a862-43e3-9a3f-0f91b1389adc";
        const socialPostId = await SocialPost.fetchSocialPostById(userId);
        const videoId = socialPostId.map((id) => id.id);
        if(videoId.length < 1) throw new Error("No video id found");
        const requestData: RequestData = {
            url: `${TikTokClient.baseUrl}/video/query/`,
            method: "POST",
            payload: {
                open_id: open_id,
                access_token: access_token,
                filters: {
                    video_ids: videoId,
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
        const tiktokRes = await doFetch(requestData);
        if(!tiktokRes || !tiktokRes.data) throw new Error("There was an error fetching tiktok data");
        console.log("Tiktok video res", tiktokRes);
        return tiktokRes;
    };
}
