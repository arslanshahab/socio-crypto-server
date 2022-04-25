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
    const participant = await Participant.findOne({
        where: { campaign: post.campaign, user: post.user },
        relations: ["campaign", "user"],
    });
    if (!participant) throw new Error("participant not found");
    const campaign = await Campaign.findOne({ where: { id: participant.campaign.id }, relations: ["org"] });
    if (!campaign) throw new Error("campaign not found");
    let qualityScore = await QualityScore.findOne({ where: { participantId: participant.id } });
    if (!qualityScore) qualityScore = QualityScore.newQualityScore(participant.id);
    const likesMultiplier = calculateQualityMultiplier(qualityScore.likes);
    const sharesMultiplier = calculateQualityMultiplier(qualityScore.shares);
    const likesAdjustedScore = likes
        .minus(post.likes)
        .times(post.campaign.algorithm.pointValues.likes)
        .times(likesMultiplier);
    const sharesAdjustedScore = shares
        .minus(post.shares)
        .times(post.campaign.algorithm.pointValues.shares)
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
        participant.user,
        campaign,
        participant,
        "likes",
        likesAdjustedScore,
        adjustedRawLikes
    );
    await DailyParticipantMetric.upsert(
        participant.user,
        campaign,
        participant,
        "shares",
        sharesAdjustedScore,
        adjustedRawShares
    );
    return post;
};

(async () => {
    console.log("Starting Cron.");
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    console.log("Database connected");
    let postsToSave: SocialPost[] = [];
    const campaigns = await Campaign.find({
        where: {
            endDate: MoreThan(DateUtils.mixedDateToUtcDatetimeString(new Date())),
            status: "APPROVED",
            auditStatus: "DEFAULT",
        },
    });
    for (let campaignIndex = 0; campaignIndex < campaigns.length; campaignIndex++) {
        const campaign = campaigns[campaignIndex];
        const take = 100;
        let skip = 0;
        const totalPosts = await SocialPost.count({ where: { campaign }, relations: ["user", "campaign"] });
        const loop = Math.ceil(totalPosts / take);
        for (let postIndex = 0; postIndex < loop; postIndex++) {
            let posts = await SocialPost.find({ where: { campaign }, relations: ["user", "campaign"], take, skip });
            for (const post of posts) {
                const socialLink = await SocialLink.findOne({
                    where: { user: post.user, type: post.type },
                    relations: ["user"],
                });
                if (socialLink) {
                    try {
                        if (socialLink?.type === "twitter") {
                            const response = await TwitterClient.get(socialLink, post.id, false);
                            const responseJSON = JSON.parse(response);
                            const updatedPost = await updatePostMetrics(
                                new BN(responseJSON["favorite_count"]),
                                new BN(responseJSON["retweet_count"]),
                                post
                            );
                            postsToSave.push(updatedPost);
                        }
                        if (socialLink?.type === "tiktok") {
                            const postDetails = (await TikTokClient.getPosts(socialLink, [post.id]))[0];
                            const likeCount = postDetails.like_count;
                            const shareCount = postDetails.share_count;
                            const updatedPost = await updatePostMetrics(
                                new BN(likeCount) || 0,
                                new BN(shareCount) || 0,
                                post
                            );
                            postsToSave.push(updatedPost);
                        }
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
            skip += take;
        }
    }
    await getConnection().createEntityManager().save(postsToSave);
    await connection.close();
    process.exit(0);
})();
