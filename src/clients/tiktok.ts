import { Participant } from "../models/Participant";
import FormData from "form-data";
import fs from "fs";
import { doFetch, RequestData } from "../util/fetchRequest";
import { Secrets } from "../util/secrets";
import { SocialLink } from "../models/SocialLink";

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
        const filePath = `uploads/${fileName}`;
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
            fs.unlinkSync(filePath);
            return resp;
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
}
