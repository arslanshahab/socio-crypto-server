import { decrypt, encrypt } from "../util/crypto";
import { SocialLink } from "../models/SocialLink";
import { TwitterClient } from "../clients/twitter";
import { Participant } from "../models/Participant";
import { SocialPost } from "../models/SocialPost";
import { calculateParticipantSocialScore } from "./helpers";
import { User } from "../models/User";
import { FacebookClient } from "../clients/facebook";
import { HourlyCampaignMetric } from "../models/HourlyCampaignMetric";
import { Campaign } from "../models/Campaign";
import fetch from "node-fetch";
import { CampaignMedia } from "../models/CampaignMedia";
export const allowedSocialLinks = ["twitter", "facebook"];

const assetUrl =
    process.env.NODE_ENV === "production"
        ? "https://raiinmaker-media.api.raiinmaker.com"
        : "https://raiinmaker-media-staging.api.raiinmaker.com";

export const getSocialClient = (type: string, accessToken?: string) => {
    let client: any;
    switch (type) {
        case "twitter":
            client = TwitterClient;
            break;
        case "facebook":
            if (!accessToken) throw new Error("access token required");
            client = FacebookClient.getClient(accessToken);
            break;
        default:
            throw new Error("no client for this social link type");
    }
    return client;
};

export const registerSocialLink = async (
    parent: any,
    args: { type: string; apiKey: string; apiSecret: string },
    context: { user: any }
) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id }, relations: ["socialLinks"] });
    const { type, apiKey, apiSecret } = args;
    if (!allowedSocialLinks.includes(type)) throw new Error("the type must exist as a predefined type");
    const existingLink = user.socialLinks.find((link: SocialLink) => link.type === type);
    const encryptedApiKey = encrypt(apiKey);
    const encryptedApiSecret = encrypt(apiSecret);
    if (existingLink) {
        existingLink.apiKey = encryptedApiKey;
        existingLink.apiSecret = encryptedApiSecret;
        await existingLink.save();
    } else {
        const link = new SocialLink();
        link.type = type;
        link.apiKey = encryptedApiKey;
        link.apiSecret = encryptedApiSecret;
        link.user = user;
        await link.save();
    }
    return true;
};

export const removeSocialLink = async (parent: any, args: { type: string }, context: { user: any }) => {
    const { type } = args;
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id }, relations: ["socialLinks"] });
    if (!allowedSocialLinks.includes(type)) throw new Error("the type must exist as a predefined type");
    const existingType = user.socialLinks.find((link) => link.type === type);
    if (existingType) await existingType.remove();
    return true;
};

export const postToSocial = async (
    parent: any,
    args: {
        socialType: "twitter" | "facebook";
        text: string;
        mediaType: "video" | "photo" | "gif";
        mediaFormat: string;
        media: string;
        participantId: string;
        defaultMedia: boolean;
        mediaId: string;
    },
    context: { user: any }
) => {
    try {
        console.log(`posting to social`);
        const startTime = new Date().getTime();
        let { socialType, text, mediaType, mediaFormat, media, participantId, defaultMedia, mediaId } = args;
        if (!allowedSocialLinks.includes(socialType)) throw new Error("the type must exist as a predefined type");
        const { id } = context.user;
        const user = await User.findOneOrFail({ where: { identityId: id }, relations: ["socialLinks"] });
        const participant = await Participant.findOneOrFail({
            where: { id: participantId, user },
            relations: ["campaign"],
        });
        if (!participant.campaign.isOpen()) throw new Error("campaign is closed");
        const socialLink = user.socialLinks.find((link) => link.type === socialType);
        if (!socialLink) throw new Error(`you have not linked ${socialType} as a social platform`);
        const campaign = await Campaign.findOne({
            where: { id: participant.campaign.id },
            relations: ["org", "campaignMedia"],
        });
        if (!campaign) throw new Error("campaign not found");
        const client = getSocialClient(socialType);
        if (defaultMedia) {
            console.log(`downloading media with mediaID ----- ${mediaId}`);
            const selectedMedia = await CampaignMedia.findOne({ where: { id: mediaId } });
            console.log(`media found ----- ${selectedMedia}`);
            if (selectedMedia) {
                const mediaUrl = `${assetUrl}/campaign/${campaign.id}/${selectedMedia.media}`;
                const downloaded = await downloadMedia(mediaUrl, selectedMedia.mediaFormat);
                media = downloaded;
                mediaFormat = selectedMedia.mediaFormat;
            } else {
                throw new Error(`Provided mediaId doesn't exist`);
            }
        }
        let postId: string;
        if (mediaType && mediaFormat) {
            postId = await client.post(
                participant,
                socialLink.asClientCredentials(),
                text,
                media,
                mediaType,
                mediaFormat
            );
        } else {
            postId = await client.post(participant, socialLink.asClientCredentials(), text);
        }
        console.log(`Posted to twitter with ID: ${postId}`);
        await HourlyCampaignMetric.upsert(campaign, campaign.org, "post");
        await participant.campaign.save();
        const socialPost = await SocialPost.newSocialPost(
            postId,
            socialType,
            participant.id,
            user,
            participant.campaign
        ).save();
        const endTime = new Date().getTime();
        const timeTaken = (endTime - startTime) / 1000;
        console.log("number of seconds taken for this upload", timeTaken);
        return socialPost.id;
    } catch (error) {
        console.log(error);
        return error.message;
    }
};

export const getTotalFollowers = async (parent: any, args: any, context: { user: any }) => {
    let client;
    const { id } = context.user;
    const followerTotals: { [key: string]: number } = {};
    const user = await User.findOneOrFail({ where: { identityId: id } });
    const socialLinks = await SocialLink.find({ where: { user } });
    for (const link of socialLinks) {
        switch (link.type) {
            case "twitter":
                client = getSocialClient(link.type);
                followerTotals["twitter"] = await client.getTotalFollowers(link.asClientCredentials(), link.id);
                if (link.followerCount !== followerTotals["twitter"]) {
                    link.followerCount = followerTotals["twitter"];
                    await link.save();
                }
                break;
            case "facebook":
                const data = await FacebookClient.getPageData(decrypt(link.apiKey));
                followerTotals["facebook"] = data["friends"];
                if (link.followerCount !== followerTotals["facebook"]) {
                    link.followerCount = followerTotals["facebook"];
                    await link.save();
                }
                break;
            default:
                break;
        }
    }
    return followerTotals;
};

export const getTweetById = async (parent: any, args: { id: string; type: string }, context: { user: any }) => {
    const { id, type } = args;
    const { id: identityId } = context.user;
    const user = await User.findOneOrFail({ where: { identityId }, relations: ["socialLinks"] });
    const socialLink = user.socialLinks.find((link) => link.type === "twitter");
    if (!socialLink) throw new Error(`you have not linked twitter as a social platform`);
    const client = getSocialClient(type);
    return client.get(socialLink.asClientCredentials(), id);
};

export const getParticipantSocialMetrics = async (parent: any, args: { id: string }, context: { user: any }) => {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const participant = await Participant.findOne({ where, relations: ["campaign"] });
    if (!participant) throw new Error("participant not found");
    const metrics = await calculateParticipantSocialScore(participant, participant.campaign);
    return {
        totalLikes: parseFloat(metrics.totalLikes.toString()),
        totalShares: parseFloat(metrics.totalShares.toString()),
        likesScore: parseFloat(metrics.likesScore.toString()),
        shareScore: parseFloat(metrics.shareScore.toString()),
    };
};

const downloadMedia = async (url: string, format: string): Promise<string> => {
    return await fetch(url)
        .then((r) => r.buffer())
        .then((buf) => `data:${format};base64,` + buf.toString("base64"));
};
