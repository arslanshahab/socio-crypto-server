import Twitter from "twitter";
import logger from "../util/logger";
import { Secrets } from "../util/secrets";
import { SocialClientCredentials } from "../types";
import { getRedis } from "./redis";
import { extractVideoData, chunkVideo, sleep } from "../controllers/helpers";
// import { getBase64FileExtension } from "../util/helpers";

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
        return response.media_id_string;
    };

    public static checkUploadStatus = async (client: Twitter, mediaId: string) => {
        console.log("checking media upload status");
        const options = { command: "STATUS", media_id: mediaId };
        const response = await client.get("media/upload", options);
        console.log(`get status response for media: ${mediaId} ${JSON.stringify(response)}`);
        return response.processing_info.state;
    };

    public static postChunkedMedia = async (
        client: Twitter,
        media: string,
        mediaType: "video" | "gif" | undefined,
        format: string | undefined
    ): Promise<string> => {
        console.log(`posting ${mediaType} to twitter`);
        const [mediaData, mediaSize] = extractVideoData(media);
        const options = {
            command: "INIT",
            media_type: format,
            total_bytes: mediaSize,
            media_category: mediaType === "video" ? "tweet_video" : "tweet_gif",
        };
        const initResponse = await client.post("media/upload", options);
        const mediaId = initResponse.media_id_string;
        console.log(`${mediaType} posted with response: ${JSON.stringify(initResponse)}`);
        const chunks = chunkVideo(mediaData);
        const promiseArray: Array<Promise<any>> = [];
        for (let i = 0; i < chunks.length; i++) {
            const appendOptions = { command: "APPEND", media_id: mediaId, segment_index: i, media_data: chunks[i] };
            promiseArray.push(client.post("media/upload", appendOptions));
        }
        await Promise.all(promiseArray);
        const finalizeOptions = { command: "FINALIZE", media_id: mediaId };
        const finalizeResponse = await client.post("media/upload", finalizeOptions);
        console.log(`finalize response: ${JSON.stringify(finalizeResponse)}`);
        if (finalizeResponse.processing_info && finalizeResponse.processing_info.state === "pending") {
            let statusResponse = await TwitterClient.checkUploadStatus(client, mediaId);
            while (statusResponse !== "failed" && statusResponse !== "succeeded") {
                await sleep(Number(finalizeResponse.processing_info.check_after_secs) * 1000);
                statusResponse = await TwitterClient.checkUploadStatus(client, mediaId);
            }
        }
        return mediaId;
    };

    public static post = async (
        credentials: SocialClientCredentials,
        text: string,
        data?: string,
        mediaType?: "photo" | "video" | "gif",
        mediaFormat?: string
    ): Promise<string> => {
        try {
            logger.debug(`posting tweet to twitter with text: ${text}`);
            const options: { [key: string]: string } = { status: text };
            const client = TwitterClient.getClient(credentials);
            if (data && mediaType && mediaFormat) {
                options["media_ids"] =
                    mediaType === "photo"
                        ? await TwitterClient.postImage(client, data, mediaFormat)
                        : await TwitterClient.postChunkedMedia(client, data, mediaType, mediaFormat);
            }
            logger.info(`posting to twitter with mediaType:  ${mediaType}`);
            const response = await client.post("/statuses/update", options);
            logger.info(`Response printed with ${JSON.stringify(response)}`);
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
