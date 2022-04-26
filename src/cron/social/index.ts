import { Campaign } from "../../models/Campaign";
import { TwitterClient } from "../../clients/twitter";
import { SocialPost } from "../../models/SocialPost";
import { getConnection, MoreThan } from "typeorm";
import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import { SocialLink } from "../../models/SocialLink";
import { Participant } from "../../models/Participant";
import { BigNumber } from "bignumber.js";
import { BN, calculateQualityMultiplier } from "../../util";
import { DailyParticipantMetric } from "../../models/DailyParticipantMetric";
import { HourlyCampaignMetric } from "../../models/HourlyCampaignMetric";
import { QualityScore } from "../../models/QualityScore";
import * as dotenv from "dotenv";
import { TikTokClient } from "../../clients/tiktok";
import { DateUtils } from "typeorm/util/DateUtils";

dotenv.config();
const app = new Application();

const updatePostMetrics = async (likes: BigNumber, shares: BigNumber, post: SocialPost) => {
    const participant = await Participant.findOne({ where: { campaign: post.campaign, user: post.user } });
    if (!participant) throw new Error("participant not found");
    const campaign = await Campaign.findOne({ where: { id: post.campaign.id }, relations: ["org"] });
    if (!campaign) throw new Error("campaign not found");
    let qualityScore = await QualityScore.findOne({ where: { participantId: participant.id } });
    if (!qualityScore) qualityScore = QualityScore.newQualityScore(participant.id);
    const likesMultiplier = calculateQualityMultiplier(qualityScore.likes);
    const sharesMultiplier = calculateQualityMultiplier(qualityScore.shares);
    const likesAdjustedScore = likes
        .minus(post.likes)
        .times(campaign.algorithm.pointValues.likes)
        .times(likesMultiplier);
    const sharesAdjustedScore = shares
        .minus(post.shares)
        .times(campaign.algorithm.pointValues.shares)
        .times(sharesMultiplier);
    campaign.totalParticipationScore = campaign.totalParticipationScore.plus(
        likesAdjustedScore.plus(sharesAdjustedScore)
    );
    participant.participationScore = participant.participationScore.plus(likesAdjustedScore.plus(sharesAdjustedScore));
    const adjustedRawLikes = likes.minus(post.likes).toNumber();
    const adjustedRawShares = shares.minus(post.shares).toNumber();
    post.likes = likes;
    post.shares = shares;
    await participant.save();
    await campaign.save();
    await qualityScore.save();
    await HourlyCampaignMetric.upsert(campaign, campaign.org, "likes", adjustedRawLikes);
    await HourlyCampaignMetric.upsert(campaign, campaign.org, "shares", adjustedRawShares);
    await DailyParticipantMetric.upsert(
        post.user,
        campaign,
        participant,
        "likes",
        likesAdjustedScore,
        adjustedRawLikes
    );
    await DailyParticipantMetric.upsert(
        post.user,
        campaign,
        participant,
        "shares",
        sharesAdjustedScore,
        adjustedRawShares
    );
    return post;
};

(async () => {
    console.log("STARTING CRON.");
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    console.log("DATABASE CONNECTED.");
    try {
        const campaigns = await Campaign.find({
            where: {
                endDate: MoreThan(DateUtils.mixedDateToUtcDatetimeString(new Date())),
                status: "APPROVED",
                auditStatus: "DEFAULT",
            },
        });
        console.log("TOTAL CAMPAIGNS: ", campaigns.length);
        for (let campaignIndex = 0; campaignIndex < campaigns.length; campaignIndex++) {
            const campaign = campaigns[campaignIndex];
            const take = 200;
            let skip = 0;
            const totalPosts = await SocialPost.count({ where: { campaign }, relations: ["user", "campaign"] });
            console.log("TOTAL POSTS FOR CAMPAIGN ID: ", campaign.id, totalPosts);
            const loop = Math.ceil(totalPosts / take);
            for (let postPageIndex = 0; postPageIndex < loop; postPageIndex++) {
                let posts = await SocialPost.find({ where: { campaign }, relations: ["campaign", "user"], take, skip });
                console.log(posts.length);
                const postsToSave: SocialPost[] = [];
                const twitterPromiseArray = [];
                const tiktokPromiseArray = [];
                const twitterPosts = [];
                const tiktokPosts = [];
                for (const post of posts) {
                    const socialLink = await SocialLink.findOne({
                        where: { user: post.user, type: post.type },
                    });
                    if (!socialLink) continue;
                    try {
                        if (socialLink.type === "twitter") {
                            twitterPromiseArray.push(TwitterClient.get(socialLink, post.id, false));
                            twitterPosts.push(post);
                        }
                        if (socialLink?.type === "tiktok") {
                            tiktokPromiseArray.push(TikTokClient.getPosts(socialLink, [post.id]));
                            tiktokPosts.push(post);
                        }
                    } catch (error) {}
                }

                console.log("TWITTER TOTAL PROMISES ---- ", twitterPromiseArray.length);
                console.log("TIKTOK TOTAL PROMISES ---- ", tiktokPromiseArray.length);
                let fulfilledTwitterPromises = 0;
                let fulfilledTiktokPromises = 0;

                try {
                    const twitterResponses = await Promise.allSettled(twitterPromiseArray);
                    for (let twitterRespIndex = 0; twitterRespIndex < twitterResponses.length; twitterRespIndex++) {
                        const twitterResp = twitterResponses[twitterRespIndex];
                        const post = twitterPosts[twitterRespIndex];
                        if (twitterResp.status === "fulfilled" && twitterResp.value) {
                            // console.log("preparing and updating social score.");
                            const responseJSON = JSON.parse(twitterResp.value);
                            const updatedPost = await updatePostMetrics(
                                new BN(responseJSON["favorite_count"]),
                                new BN(responseJSON["retweet_count"]),
                                post
                            );
                            postsToSave.push(updatedPost);
                            fulfilledTwitterPromises += 1;
                        }
                    }
                } catch (error) {
                    console.log("there was an error making request to twitter.");
                }

                try {
                    const tiktokResponses = await Promise.allSettled(tiktokPromiseArray);
                    for (let tiktokRespIndex = 0; tiktokRespIndex < tiktokResponses.length; tiktokRespIndex++) {
                        const tiktokResp = tiktokResponses[tiktokRespIndex];
                        const post = tiktokPosts[tiktokRespIndex];
                        if (tiktokResp.status === "fulfilled") {
                            // console.log("preparing and updating social score.");
                            const postDetails = tiktokResp.value[0];
                            const likeCount = postDetails.like_count;
                            const shareCount = postDetails.share_count;
                            const updatedPost = await updatePostMetrics(
                                new BN(likeCount) || 0,
                                new BN(shareCount) || 0,
                                post
                            );
                            postsToSave.push(updatedPost);
                            fulfilledTiktokPromises += 1;
                        }
                    }
                } catch (error) {
                    console.log("there was an error making request to tiktok.");
                }
                skip += take;
                console.log("FULFILLED TWITTER PROMISES ----.", fulfilledTwitterPromises);
                console.log("FULFILLED TIKTOK PROMISES ----.", fulfilledTiktokPromises);
                console.log("SAVING UPDATED POSTS ----.", postsToSave.length);
                await getConnection().createEntityManager().save(postsToSave);
            }
        }
    } catch (error) {}
    await connection.close();
    process.exit(0);
})();
