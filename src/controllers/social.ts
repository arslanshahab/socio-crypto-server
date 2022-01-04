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
import { CampaignMedia } from "../models/CampaignMedia";
import { ApolloError } from "apollo-server-express";
import { TikTokClient } from "../clients/tiktok";
import { downloadMedia } from "../helpers";
import { JWTPayload, SocialType } from "src/types";

export const allowedSocialLinks = ["twitter", "facebook", "tiktok"];

const assetUrl =
    process.env.NODE_ENV === "production"
        ? "https://raiinmaker-media.api.raiinmaker.com"
        : "https://raiinmaker-media-staging.api.raiinmaker.com";

export const getSocialClient = (type: string, accessToken?: string): any => {
    switch (type) {
        case "twitter":
            return TwitterClient;
        case "tiktok":
            return TikTokClient;
        case "facebook":
            if (!accessToken) throw new Error("access token required");
            return FacebookClient.getClient(accessToken);
        default:
            throw new Error("no client for this social link type");
    }
};

export const registerSocialLink = async (
    parent: any,
    args: { type: SocialType; apiKey: string; apiSecret: string },
    context: { user: any }
) => {
    const { id, userId } = context.user;
    const user = await User.findOne({ where: [{ identityId: id }, { id: userId }], relations: ["socialLinks"] });
    if (!user) throw new Error("User not found");
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

export const registerTiktokSocialLink = async (parent: any, args: { code: string }, context: { user: JWTPayload }) => {
    const user = await User.findUserByContext(context.user, ["socialLinks"]);
    if (!user) throw new Error("User not found");
    const { code } = args;
    console.log(code);
    return true;
};

export const removeSocialLink = async (parent: any, args: { type: string }, context: { user: any }) => {
    const { type } = args;
    const { id, userId } = context.user;
    const user = await User.findOne({ where: [{ identityId: id }, { id: userId }], relations: ["socialLinks"] });
    if (!user) throw new Error("User not found");
    if (!allowedSocialLinks.includes(type)) throw new Error("the type must exist as a predefined type");
    const existingType = user.socialLinks.find((link) => link.type === type);
    if (existingType) await existingType.remove();
    return true;
};

export const postToSocial = async (
    parent: any,
    args: {
        socialType: "twitter" | "facebook" | "tiktok";
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
        if (!allowedSocialLinks.includes(socialType)) throw new ApolloError(`posting to ${socialType} is not allowed`);
        const { id, userId } = context.user;
        const user = await User.findOne({ where: [{ identityId: id }, { id: userId }], relations: ["socialLinks"] });
        if (!user) throw new Error("User not found");
        const participant = await Participant.findOne({
            where: { id: participantId, user },
            relations: ["campaign"],
        });
        if (!participant) throw new Error("Participant not found");
        if (!participant.campaign.isOpen()) throw new Error("campaign is closed");
        const socialLink = user.socialLinks.find((link) => link.type === socialType);
        // if (!socialLink) throw new Error(`you have not linked ${socialType} as a social platform`);
        const campaign = await Campaign.findOne({
            where: { id: participant.campaign.id },
            relations: ["org", "campaignMedia"],
        });
        if (!campaign) throw new Error("campaign not found");
        const client = getSocialClient(socialType);
        if (defaultMedia) {
            console.log(`downloading media with mediaID ----- ${mediaId}`);
            const selectedMedia = await CampaignMedia.findOne({ where: { id: mediaId } });
            if (!selectedMedia) throw new Error(`Provided mediaId doesn't exist`);
            const mediaUrl = `${assetUrl}/campaign/${campaign.id}/${selectedMedia.media}`;
            const downloaded = await downloadMedia(mediaType, mediaUrl, selectedMedia.mediaFormat);
            media = downloaded;
            mediaFormat = selectedMedia.mediaFormat;
        }
        let postId: string;
        if (mediaType && mediaFormat) {
            postId = await client.post(
                participant,
                socialLink?.asClientCredentials(),
                text,
                media,
                mediaType,
                mediaFormat
            );
        } else {
            postId = await client.post(participant, socialLink?.asClientCredentials(), text);
        }
        console.log(`Posted to ${socialType} with ID: ${postId}`);
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
    const { id, userId } = context.user;
    const followerTotals: { [key: string]: number } = {};
    const user = await User.findOne({ where: [{ identityId: id }, { id: userId }] });
    if (!user) throw new Error("User not found");
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
    const { id: identityId, userId } = context.user;
    const user = await User.findOne({ where: [{ identityId }, { id: userId }], relations: ["socialLinks"] });
    if (!user) throw new Error("User not found");
    const socialLink = user.socialLinks.find((link) => link.type === "twitter");
    if (!socialLink) throw new Error(`you have not linked twitter as a social platform`);
    const client = getSocialClient(type);
    return client.get(socialLink.asClientCredentials(), id);
};

export const getParticipantSocialMetrics = async (parent: any, args: { id: string }, context: { user: any }) => {
    const { id } = args;
    const participant = await Participant.findOne({ where: { id }, relations: ["campaign"] });
    if (!participant) throw new Error("participant not found");
    const metrics = await calculateParticipantSocialScore(participant, participant.campaign);
    return {
        totalLikes: parseFloat(metrics.totalLikes.toString()),
        totalShares: parseFloat(metrics.totalShares.toString()),
        likesScore: parseFloat(metrics.likesScore.toString()),
        shareScore: parseFloat(metrics.shareScore.toString()),
    };
};
