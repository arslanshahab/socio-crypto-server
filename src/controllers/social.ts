import { decrypt } from "../util/crypto";
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
import { downloadMedia } from "../util";
import { JWTPayload, SocialType } from "src/types";
import { FormattedError, GLOBAL_CAMPAIGN_NOT_FOUND, USER_NOT_FOUND } from "../util/errors";
import { TatumClient } from "../clients/tatumClient";

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
    const user = await User.findUserByContext(context.user, ["socialLinks"]);
    if (!user) throw new Error("User not found");
    const { type, apiKey, apiSecret } = args;
    console.log("args received", args);
    console.log("user data", context.user);
    console.log("user found", user);
    if (!allowedSocialLinks.includes(type)) throw new Error("the type must exist as a predefined type");
    await SocialLink.addTwitterLink(user, { apiKey, apiSecret });
    return true;
};

export const registerTiktokSocialLink = async (
    parent: any,
    args: {
        open_id: string;
        access_token: string;
        expires_in: number;
        refresh_token: string;
        refresh_expires_in: number;
    },
    context: { user: JWTPayload }
) => {
    try {
        const user = await User.findUserByContext(context.user, ["socialLinks"]);
        if (!user) throw new Error(USER_NOT_FOUND);
        // const tokens = await TikTokClient.fetchTokens(code);
        console.log("TIKTOK-TOKENS: ", args);
        // if (!tokens.data.access_token || !tokens.data.refresh_token) throw new Error(ERROR_LINKING_TIKTOK);
        await SocialLink.addOrUpdateTiktokLink(user, args);
        return { success: true };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const removeSocialLink = async (parent: any, args: { type: string }, context: { user: any }) => {
    const { type } = args;
    const user = await User.findUserByContext(context.user, ["socialLinks"]);
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
        const user = await User.findUserByContext(context.user);
        if (!user) throw new Error(USER_NOT_FOUND);
        const participant = await Participant.findOne({
            where: { id: participantId, user },
            relations: ["campaign"],
        });
        if (!participant) throw new ApolloError("Participant not found");
        if (!participant.campaign.isOpen()) throw new ApolloError("campaign is closed");
        const socialLink = await SocialLink.findOne({ where: { user, type: socialType }, relations: ["user"] });
        if (!socialLink) throw new ApolloError(`you have not linked ${socialType} as a social platform`);
        const campaign = await Campaign.findOne({
            where: { id: participant.campaign.id },
            relations: ["org", "campaignMedia"],
        });
        if (!campaign) throw new ApolloError("campaign not found");
        const client = getSocialClient(socialType);
        if (defaultMedia) {
            console.log(`downloading media with mediaID ----- ${mediaId}`);
            const selectedMedia = await CampaignMedia.findOne({ where: { id: mediaId } });
            if (!selectedMedia) throw new ApolloError(`Provided mediaId doesn't exist`);
            const mediaUrl = `${assetUrl}/campaign/${campaign.id}/${selectedMedia.media}`;
            const downloaded = await downloadMedia(mediaType, mediaUrl, selectedMedia.mediaFormat);
            media = downloaded;
            mediaFormat = selectedMedia.mediaFormat;
        }
        let postId: string;
        if (mediaType && mediaFormat) {
            postId = await client.post(participant, socialLink, text, media, mediaType, mediaFormat);
        } else {
            postId = await client.post(participant, socialLink, text);
        }
        if (!postId) throw new ApolloError("There was an error posting to twitter.");
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
        throw new FormattedError(error);
    }
};

export const getTotalFollowers = async (parent: any, args: any, context: { user: any }) => {
    let client;
    const followerTotals: { [key: string]: number } = {};
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error("User not found");
    const socialLinks = await SocialLink.find({ where: { user } });
    for (const link of socialLinks) {
        switch (link.type) {
            case "twitter":
                client = getSocialClient(link.type);
                followerTotals["twitter"] = await client.getTotalFollowers(link, link.id);
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
            case "tiktok":
                const tiktokFollower = await TikTokClient.getFolowers();
                followerTotals["tiktok"] = tiktokFollower;
                if (link.followerCount !== followerTotals["tiktok"]) {
                    link.followerCount = followerTotals["tiktok"];
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
    const user = await User.findUserByContext(context.user, ["socialLinks"]);
    if (!user) throw new Error("User not found");
    const socialLink = user.socialLinks.find((link) => link.type === "twitter");
    if (!socialLink) throw new Error(`you have not linked twitter as a social platform`);
    const client = getSocialClient(type);
    return client.get(socialLink, id);
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

export const postContentGlobally = async (
    parent: any,
    args: {
        socialType: "twitter" | "facebook" | "tiktok";
        text: string;
        mediaType: "video" | "photo" | "gif";
        mediaFormat: string;
        media: string;
    },
    context: { user: JWTPayload }
) => {
    try {
        if (!allowedSocialLinks.includes(args.socialType))
            throw new ApolloError(`posting to ${args.socialType} is not allowed`);
        const user = await User.findUserByContext(context.user, ["socialLinks", "wallet"]);
        if (!user) throw new Error(USER_NOT_FOUND);
        const globalCampaign = await Campaign.findOne({
            where: { isGlobal: true, symbol: "COIIN" },
            relations: ["org"],
        });
        if (!globalCampaign) throw new Error(GLOBAL_CAMPAIGN_NOT_FOUND);
        let participant = await Participant.findOne({ where: { user, campaign: globalCampaign } });
        if (!participant) {
            if (await TatumClient.isCurrencySupported(globalCampaign.symbol)) {
                await TatumClient.findOrCreateCurrency(globalCampaign.symbol, user.wallet);
            }
            participant = await Participant.createNewParticipant(user, globalCampaign, user.email);
        }
        await postToSocial(
            null,
            { ...args, defaultMedia: false, mediaId: "none", participantId: participant.id },
            context
        );
        return { success: true };
    } catch (error) {
        throw new FormattedError(error);
    }
};
