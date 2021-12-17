const uploadUrl = "https://open-api.tiktok.com/share/video/upload";
import fetch from "node-fetch";
const open_id = "a509c4e1-a862-43e3-9a3f-0f91b1389adc";
const access_token = "act.b0d0e16756accacfcb25b274766fe4c8EOG84BmzVyh2LaNBnzOd8fm2Hbpq";
import { URLSearchParams } from "url";
import { Participant } from "../models/Participant";
import { SocialClientCredentials } from "../types.d";
import FormData from "form-data";

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
        const fileContents = Buffer.from(data, "base64");
        const formData = new FormData();
        formData.append("video", fileContents);
        const resp = await fetch(`${uploadUrl}?${new URLSearchParams({ open_id, access_token })}`, {
            method: "POST",
            headers: {
                "Content-Type": "multipart/form-data",
            },
            body: formData,
        });
        const json = await resp.json();
        console.log(json);
        return JSON.stringify(json);
    };
}
