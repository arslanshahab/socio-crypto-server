const uploadUrl = "https://open-api.tiktok.com/share/video/upload";
const open_id = "a509c4e1-a862-43e3-9a3f-0f91b1389adc";
const access_token = "act.dbd28d98af1efdcb7821032da29accbesZQjL7GaMBXVZuCdQUGv3bWvJaPb";
import { URLSearchParams } from "url";
import { Participant } from "../models/Participant";
import { SocialClientCredentials } from "../types.d";
import FormData from "form-data";
import fs from "fs";
import axios from "axios";
export class TikTokClient {
    public static baseUrl = "https://open-api.tiktok.com";

    public static post = async (
        participant: Participant,
        credentials: SocialClientCredentials,
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
            await axios.post(`${uploadUrl}?${new URLSearchParams({ open_id, access_token })}`, formData, {
                headers: formData.getHeaders(),
            });
            fs.unlinkSync(filePath);
            return "response";
        } catch (error) {
            console.log(error.response.data);
            fs.unlinkSync(filePath);
            throw new Error(error.response.data);
        }
    };
}
