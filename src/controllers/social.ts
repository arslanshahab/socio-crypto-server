import { decrypt, encrypt } from "../util/crypto";
import { SocialLink } from "../models/SocialLink";
import { TwitterClient } from "../clients/twitter";
import logger from "../util/logger";
import { Participant } from "../models/Participant";
import { SocialPost } from "../models/SocialPost";
import { calculateParticipantSocialScore } from "./helpers";
import { User } from "../models/User";
import { FacebookClient } from "../clients/facebook";
import { HourlyCampaignMetric } from "../models/HourlyCampaignMetric";
import { Campaign } from "../models/Campaign";

export const allowedSocialLinks = ["twitter", "facebook"];

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
    args: { type: string; text: string; photo: string; gif: string; video: string; participantId: string },
    context: { user: any }
) => {
    const { type, text, photo, gif, video, participantId } = args;
    console.log("photo data-----------", photo);
    console.log("gif data-----------", gif);
    console.log("video data-----------", video);
    if (!allowedSocialLinks.includes(type)) throw new Error("the type must exist as a predefined type");
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id }, relations: ["socialLinks"] });
    const participant = await Participant.findOneOrFail({
        where: { id: participantId, user },
        relations: ["campaign"],
    });
    if (!participant.campaign.isOpen()) throw new Error("campaign is closed");
    const socialLink = user.socialLinks.find((link) => link.type === type);
    if (!socialLink) throw new Error(`you have not linked ${type} as a social platform`);
    const campaign = await Campaign.findOne({ where: { id: participant.campaign.id }, relations: ["org"] });
    if (!campaign) throw new Error("campaign not found");
    const client = getSocialClient(type);
    let postId: string;
    if (video) {
        console.log("video---------");
        postId = await client.post(socialLink.asClientCredentials(), text, video, "video");
    } else if (photo) {
        console.log("image---------");
        postId = await client.post(socialLink.asClientCredentials(), text, photo, "photo");
    } else if (gif) {
        console.log("gif----------");
        postId = await client.post(socialLink.asClientCredentials(), text, photo, "gif");
    } else {
        console.log("default-----------");
        postId = await client.post(socialLink.asClientCredentials(), text);
    }
    logger.info(`Posted to twitter with ID: ${postId}`);
    await HourlyCampaignMetric.upsert(campaign, campaign.org, "post");
    await participant.campaign.save();
    const socialPost = await SocialPost.newSocialPost(postId, type, participant.id, user, participant.campaign).save();
    return socialPost.id;
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
