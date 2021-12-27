const uploadUrl = "https://open-api.tiktok.com/share/video/upload";
const open_id = "a509c4e1-a862-43e3-9a3f-0f91b1389adc";
const access_token = "act.061c62cc03b92c2ddecbe98986a2dca3Na3Xe2ta06DTNkRWTXURuLa9mDZq";
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
        try {
            var bitmap = Buffer.from(data, "base64");
            fs.writeFileSync("uploads/example2.mp4", bitmap);
            const formData = new FormData();
            formData.append("video", fs.createReadStream("uploads/example2.mp4"));
            await axios.post(`${uploadUrl}?${new URLSearchParams({ open_id, access_token })}`, formData, {
                headers: formData.getHeaders(),
            });
            return "response";
        } catch (error) {
            console.log(error.response.data);
            throw new Error(error.response.data);
        }
    };
}
