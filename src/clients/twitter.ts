import Twitter from "twitter";
import logger from "../util/logger";
import { Secrets } from "../util/secrets";
import { SocialClientCredentials } from "../types";
import { getRedis } from "./redis";
import { extractVideoData, chunkVideo, sleep } from "../controllers/helpers";
import { Participant } from "../models/Participant";

export class TwitterClient {
    public static getClient(userCredentials: SocialClientCredentials): Twitter {
        return new Twitter({
            consumer_key: Secrets.twitterConsumerKey,
            consumer_secret: Secrets.twitterConsumerSecretKey,
            access_token_key: userCredentials.apiKey as string,
            access_token_secret: userCredentials.apiSecret as string,
        });
    }

    public static postImage = async (client: Twitter, photo: string, format: string | undefined): Promise<string> => {
        console.log("posting image to twitter");
        const options = { media_category: "tweet_image", media_data: photo, media_type: format };
        const response = await client.post("/media/upload", options);
        console.log(response);
        return response.media_id_string;
    };

    public static checkUploadStatus = async (client: Twitter, mediaId: string) => {
        const options = { command: "STATUS", media_id: mediaId };
        const response = await client.get("media/upload", options);
        return response.processing_info.state;
    };

    public static postChunkedMedia = async (
        client: Twitter,
        media: string,
        mediaType: "video" | "gif" | undefined,
        format: string | undefined
    ): Promise<string> => {
        try {
            console.log(`posting ${mediaType} to twitter ------`);
            const [mediaData, mediaSize] = extractVideoData(media);
            console.log(`extracted media size -------`);
            const options = {
                command: "INIT",
                media_type: format,
                total_bytes: mediaSize,
                media_category: mediaType === "video" ? "tweet_video" : "tweet_gif",
            };
            const initResponse = await client.post("media/upload", options);
            const mediaId = initResponse.media_id_string;
            console.log("upload initiated with media ID -----", mediaId);
            const chunks = chunkVideo(mediaData);
            const promiseArray: Promise<any>[] = [];

            for (let i = 0; i < chunks.length; i++) {
                const appendOptions = { command: "APPEND", media_id: mediaId, segment_index: i, media_data: chunks[i] };
                promiseArray.push(client.post("media/upload", appendOptions));
            }
            console.log("media chunks -----", promiseArray.length);
            let count = 0;
            while (promiseArray.length) {
                const requests = promiseArray.splice(0, 5);
                console.log("posting chunk -----", count);
                await Promise.all(requests);
                count++;
            }
            const finalizeOptions = { command: "FINALIZE", media_id: mediaId };
            const finalizeResponse = await client.post("media/upload", finalizeOptions);
            if (finalizeResponse.processing_info && finalizeResponse.processing_info.state === "pending") {
                let statusResponse = await TwitterClient.checkUploadStatus(client, mediaId);
                while (statusResponse !== "failed" && statusResponse !== "succeeded") {
                    await sleep(Number(finalizeResponse.processing_info.check_after_secs) * 1000);
                    statusResponse = await TwitterClient.checkUploadStatus(client, mediaId);
                }
            }
            return mediaId;
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    public static post = async (
        participant: Participant,
        credentials: SocialClientCredentials,
        text: string,
        data?: string,
        mediaType?: "photo" | "video" | "gif",
        mediaFormat?: string
    ): Promise<string> => {
        try {
            text = text.replace("@", "#");
            logger.debug(`posting tweet to twitter with text: ${text}`);
            if (text.length > 200) throw new Error("Text too long for twitter");
            const options: { [key: string]: string } = { status: text };
            const client = TwitterClient.getClient(credentials);
            if (data && mediaType && mediaFormat) {
                options["media_ids"] =
                    mediaType === "photo"
                        ? await TwitterClient.postImage(client, data, mediaFormat)
                        : await TwitterClient.postChunkedMedia(client, data, mediaType, mediaFormat);
            }
            const response = await client.post("/statuses/update", options);
            return response.id_str;
        } catch (error) {
            console.log(error);
            return error.message;
        }
    };

    public static getTotalFollowers = async (credentials: SocialClientCredentials, id: string, cached = true) => {
        logger.info(`getting follower count`);
        let cacheKey = `twitterFollowerCount:${id}`;
        if (cached) {
            const cachedResponse = await getRedis().get(cacheKey);
            if (cachedResponse) return cachedResponse;
        }
        const client = TwitterClient.getClient(credentials);
        const response = await client.get("/account/verify_credentials", { include_entities: false });
        const followerCount = response["followers_count"];
        await getRedis().set(cacheKey, JSON.stringify(followerCount), "EX", 900);
        return followerCount;
    };

    public static get = async (credentials: SocialClientCredentials, id: string, cached = true): Promise<string> => {
        logger.debug(`retrieving tweet with id: ${id}`);
        let cacheKey = `twitter:${id}`;
        if (cached) {
            const cachedResponse = await getRedis().get(cacheKey);
            if (cachedResponse) return cachedResponse;
        }
        const client = TwitterClient.getClient(credentials);
        const twitterResponse = await client.get("/statuses/show", { id });
        await getRedis().set(cacheKey, JSON.stringify(twitterResponse), "EX", 900); // cache for 15 minutes
        return JSON.stringify(twitterResponse);
    };
}
