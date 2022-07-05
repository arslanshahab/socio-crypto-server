import Twitter from "twitter";
import logger from "../util/logger";
import { Secrets } from "../util/secrets";
import { getRedis } from "./redis";
import { extractVideoData, chunkVideo, sleep } from "../controllers/helpers";
import { Participant } from "../models/Participant";
import { SocialLink } from "../models/SocialLink";
import { MediaType, TwitterLinkCredentials } from "../types";
import { TWITTER_LINK_EXPIRED, FormattedError } from "../util/errors";
import { isArray } from "lodash";
import { decrypt } from "../util/crypto";
import { SocialLink as PrismaSocialLink } from "@prisma/client";
import { prisma } from "./prisma";
import { BadRequest } from "@tsed/exceptions";

export class TwitterClient {
    public static textLimit = 280;
    public static getClient(userCredentials: TwitterLinkCredentials): Twitter {
        return new Twitter({
            consumer_key: Secrets.twitterConsumerKey,
            consumer_secret: Secrets.twitterConsumerSecretKey,
            access_token_key: userCredentials.apiKey as string,
            access_token_secret: userCredentials.apiSecret as string,
        });
    }

    public static postImage = async (client: Twitter, photo: string, format: string | undefined): Promise<string> => {
        try {
            console.log("posting image to twitter");
            const options = { media_category: "tweet_image", media_data: photo, media_type: format };
            const response = await client.post("/media/upload", options);
            return response.media_id_string;
        } catch (error) {
            if (isArray(error)) {
                const [data] = error;
                if (data?.code === 89) {
                    throw new Error(TWITTER_LINK_EXPIRED);
                }
                throw new Error(data?.message || "");
            }
            throw new Error(error.message);
        }
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
            if (isArray(error)) {
                const [data] = error;
                if (data?.code === 89) {
                    throw new Error(TWITTER_LINK_EXPIRED);
                }
                throw new Error(data?.message || "");
            }
            throw new Error(error.message);
        }
    };

    public static post = async (
        participant: Participant,
        socialLink: SocialLink,
        text: string,
        data?: string,
        mediaType?: "photo" | "video" | "gif",
        mediaFormat?: string
    ): Promise<string> => {
        try {
            text = text.replace("@", "#");
            logger.debug(`posting tweet to twitter with text: ${text}`);
            if (text.length > TwitterClient.textLimit) throw new Error("Text too long for twitter");
            const options: { [key: string]: string } = { status: text };
            const client = TwitterClient.getClient(socialLink.getTwitterCreds());
            if (data && mediaType && mediaFormat) {
                options["media_ids"] =
                    mediaType === "photo"
                        ? await TwitterClient.postImage(client, data, mediaFormat)
                        : await TwitterClient.postChunkedMedia(client, data, mediaType, mediaFormat);
            }
            const response = await client.post("/statuses/update", options);
            return response.id_str;
        } catch (error) {
            if (isArray(error)) {
                const [data] = error;
                if (data?.code === 89) {
                    throw new Error(TWITTER_LINK_EXPIRED);
                }
                throw new Error(data?.message || "");
            }
            throw new Error(error.message);
        }
    };

    //! Post media
    public static postV2 = async (
        participantId: string,
        socialLink: PrismaSocialLink,
        text: string,
        data?: string,
        mediaType?: MediaType,
        mediaFormat?: string
    ) => {
        try {
            text = text.replace("@", "#");
            if (text.length > TwitterClient.textLimit) throw new Error("Text too long for twitter");
            const options: { [key: string]: string } = { status: text };
            const client = TwitterClient.getClient({
                apiKey: socialLink.apiKey || "",
                apiSecret: socialLink.apiSecret || "",
            });
            if (data && mediaType && mediaFormat) {
                options["media_ids"] =
                    mediaType === "photo"
                        ? await TwitterClient.postImage(client, data, mediaFormat)
                        : await TwitterClient.postChunkedMedia(client, data, mediaType, mediaFormat);
            }
            const response = await client.post("/statuses/update", options);
            return response.id_str;
        } catch (error) {
            if (isArray(error)) {
                const [data] = error;
                if (data?.code === 89) {
                    throw new BadRequest(TWITTER_LINK_EXPIRED);
                }
                throw new BadRequest(data?.message || "");
            }
            throw new BadRequest(error.message);
        }
    };

    public static getTotalFollowers = async (socialLink: SocialLink, id: string, cached = true) => {
        try {
            logger.info(`getting follower count`, socialLink, id, cached);
            let cacheKey = `twitterFollowerCount:${id}`;
            if (cached) {
                const cachedResponse = await getRedis().get(cacheKey);
                if (cachedResponse) return cachedResponse;
            }
            const client = TwitterClient.getClient(socialLink.getTwitterCreds());
            const response = await client.get("/account/verify_credentials", { include_entities: false });
            const followerCount = response["followers_count"];
            await getRedis().set(cacheKey, JSON.stringify(followerCount), "EX", 900);
            return followerCount;
        } catch (error) {
            if (isArray(error)) {
                const [data] = error;
                if (data?.code === 89) {
                    await socialLink.remove();
                    throw new FormattedError(new Error(TWITTER_LINK_EXPIRED));
                }
                throw new Error(data?.message || "");
            }
            throw new Error(error.message);
        }
    };

    public static getUsername = async (socialLink: SocialLink) => {
        try {
            const client = TwitterClient.getClient(socialLink.getTwitterCreds());
            const response = await client.get("/account/verify_credentials", { include_entities: false });
            const username = response["screen_name"];
            return username;
        } catch (error) {
            if (isArray(error)) {
                const [data] = error;
                if (data?.code === 89) {
                    await socialLink.remove();
                    throw new FormattedError(new Error(TWITTER_LINK_EXPIRED));
                }
                throw new Error(data?.message || "");
            }
            throw new Error(error.message);
        }
    };

    public static getUsernameV2 = async (socialLink: PrismaSocialLink) => {
        try {
            const client = TwitterClient.getClient({
                apiKey: socialLink.apiKey || "",
                apiSecret: socialLink.apiSecret || "",
            });
            const response = await client.get("/account/verify_credentials", { include_entities: false });
            const username = response["screen_name"];
            return username;
        } catch (error) {
            if (isArray(error)) {
                const [data] = error;
                if (data?.code === 89) {
                    await prisma.socialLink.delete({ where: { id: socialLink.id } });
                    throw new FormattedError(new Error(TWITTER_LINK_EXPIRED));
                }
                throw new Error(data?.message || "");
            }
            throw new Error(error.message);
        }
    };

    public static getTotalFollowersV1 = async (socialLink: PrismaSocialLink, id: string, cached = true) => {
        try {
            const apiKey = decrypt(socialLink.apiKey!);
            const apiSecret = decrypt(socialLink.apiSecret!);
            const cacheKey = `twitterFollowerCount:${id}`;
            if (cached) {
                const cachedResponse = await getRedis().get(cacheKey);
                if (cachedResponse) return cachedResponse;
            }
            const client = TwitterClient.getClient({ apiKey: apiKey, apiSecret: apiSecret });
            const response = await client.get("/account/verify_credentials", { include_entities: false });
            const followerCount = response["followers_count"];
            await getRedis().set(cacheKey, JSON.stringify(followerCount), "EX", 900);
            return followerCount;
        } catch (error) {
            if (isArray(error)) {
                const [data] = error;
                if (data?.code === 89) {
                    await prisma.socialLink.delete({
                        where: { id },
                    });
                    throw new FormattedError(new Error(TWITTER_LINK_EXPIRED));
                }
                throw new Error(data?.message || "");
            }
            throw new Error(error.message);
        }
    };

    public static get = async (socialLink: SocialLink, id: string, cached = true): Promise<string | undefined> => {
        try {
            let cacheKey = `twitter:${id}`;
            if (cached) {
                const cachedResponse = await getRedis().get(cacheKey);
                if (cachedResponse) return cachedResponse;
            }
            const client = TwitterClient.getClient(socialLink.getTwitterCreds());
            const twitterResponse = await client.get("/statuses/show", { id });
            await getRedis().set(cacheKey, JSON.stringify(twitterResponse), "EX", 3600); // cache for 15 minutes
            return JSON.stringify(twitterResponse);
        } catch (error) {
            return undefined;
        }
    };

    public static getPost = async (socialLink: PrismaSocialLink, id: string, cached = true): Promise<string> => {
        let cacheKey = `twitter:${id}`;
        if (cached) {
            const cachedResponse = await getRedis().get(cacheKey);
            if (cachedResponse) return cachedResponse;
        }
        const client = TwitterClient.getClient({
            apiKey: decrypt(socialLink.apiKey || "") || "",
            apiSecret: decrypt(socialLink.apiSecret || "") || "",
        });
        const twitterResponse = await client.get("/statuses/show", { id });
        await getRedis().set(cacheKey, JSON.stringify(twitterResponse), "EX", 3600); // cache for 15 minutes
        return JSON.stringify(twitterResponse);
    };
}
