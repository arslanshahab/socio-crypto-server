import { TwitterClient } from "../../clients/twitter";
import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import { BigNumber } from "bignumber.js";
import { BN, calculateQualityMultiplier } from "../../util";
import * as dotenv from "dotenv";
import { SocialPost, Prisma } from "@prisma/client";
import { prisma, readPrisma } from "../../clients/prisma";
import { CampaignStatus, CampaignAuditStatus } from "../../util/constants";
import { PointValueTypes } from "../../types.d";
import { startOfDay } from "date-fns";

dotenv.config();
const app = new Application();

const updatePostMetrics = async (likes: BigNumber, shares: BigNumber, post: SocialPost) => {
    const participant = await readPrisma.participant.findFirst({
        where: { campaignId: post.campaignId, userId: post.userId },
    });
    if (!participant) throw new Error("participant not found");
    const campaign = await readPrisma.campaign.findFirst({ where: { id: post.campaignId }, include: { org: true } });
    if (!campaign) throw new Error("campaign not found");
    const user = await readPrisma.user.findFirst({ where: { id: post.userId } });
    if (!user) throw new Error("user not found");
    let qualityScore = await readPrisma.qualityScore.findFirst({ where: { participantId: participant.id } });
    const likesMultiplier = calculateQualityMultiplier(new BN(qualityScore?.likes || 0));
    const sharesMultiplier = calculateQualityMultiplier(new BN(qualityScore?.shares || 0));
    const pointValues = (campaign.algorithm as Prisma.JsonObject)
        .pointValues as Prisma.JsonObject as unknown as PointValueTypes;
    const likesAdjustedScore = likes.minus(post.likes).times(pointValues.likes).times(likesMultiplier);
    const sharesAdjustedScore = shares.minus(post.shares).times(pointValues.shares).times(sharesMultiplier);
    const newTotalCampaignScore = new BN(campaign.totalParticipationScore).plus(
        likesAdjustedScore.plus(sharesAdjustedScore)
    );
    const newParticipationScore = new BN(participant.participationScore).plus(
        likesAdjustedScore.plus(sharesAdjustedScore)
    );
    const adjustedRawLikes = likes.minus(post.likes).toNumber();
    const adjustedRawShares = shares.minus(post.shares).toNumber();
    post.likes = likes.toString();
    post.shares = shares.toString();
    await prisma.participant.update({
        data: {
            participationScore: newParticipationScore.toString(),
        },
        where: {
            id_campaignId_userId: {
                id: participant.id,
                campaignId: participant.campaignId,
                userId: participant.userId,
            },
        },
    });
    await prisma.campaign.update({
        data: {
            totalParticipationScore: newTotalCampaignScore.toString(),
        },
        where: {
            id: campaign.id || "",
        },
    });
    await prisma.qualityScore.upsert({
        create: { likes: post.likes, shares: post.shares, participantId: participant.id },
        update: {
            likes: post.likes,
            shares: post.shares,
        },
        where: {
            id: qualityScore?.id,
        },
    });
    const hourlyMetric = await readPrisma.hourlyCampaignMetric.findFirst({ where: { campaignId: campaign.id } });
    await prisma.hourlyCampaignMetric.create({
        data: {
            campaignId: campaign.id,
            likeCount: (parseInt(hourlyMetric?.likeCount || "0") + adjustedRawLikes).toString(),
            shareCount: (parseInt(hourlyMetric?.shareCount || "0") + adjustedRawShares).toString(),
        },
    });
    const dailyMetric = await readPrisma.dailyParticipantMetric.findFirst({
        where: {
            userId: user.id,
            campaignId: campaign.id,
            participantId: participant.id,
            createdAt: { gt: startOfDay(new Date()) },
        },
    });
    await prisma.dailyParticipantMetric.upsert({
        where: { id: dailyMetric?.id || "" },
        update: {
            participationScore: (
                parseInt(dailyMetric?.participationScore || "0") +
                likesAdjustedScore.plus(sharesAdjustedScore).toNumber()
            ).toString(),
            likeCount: (parseInt(dailyMetric?.likeCount || "0") + adjustedRawLikes).toString(),
            shareCount: (parseInt(dailyMetric?.shareCount || "0") + adjustedRawShares).toString(),
        },
        create: {
            participantId: participant.id,
            campaignId: campaign.id,
            userId: user.id,
            participationScore: likesAdjustedScore.plus(sharesAdjustedScore).toNumber().toString(),
            likeCount: adjustedRawLikes.toString(),
            shareCount: adjustedRawShares.toString(),
        },
    });
    return post;
};

(async () => {
    console.log("STARTING CRON.");
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    console.log("DATABASE CONNECTED.");
    try {
        const campaigns = await readPrisma.campaign.findMany({
            where: {
                endDate: { gte: new Date() },
                status: CampaignStatus.APPROVED,
                auditStatus: CampaignAuditStatus.DEFAULT,
            },
        });
        console.log("TOTAL CAMPAIGNS: ", campaigns.length);
        for (let campaignIndex = 0; campaignIndex < campaigns.length; campaignIndex++) {
            const campaign = campaigns[campaignIndex];
            const take = 200;
            let skip = 0;
            const totalPosts = await readPrisma.socialPost.count({ where: { campaignId: campaign.id } });
            console.log("TOTAL POSTS FOR CAMPAIGN ID: ", campaign.id, totalPosts);
            const loop = Math.ceil(totalPosts / take);
            for (let postPageIndex = 0; postPageIndex < loop; postPageIndex++) {
                let posts = await readPrisma.socialPost.findMany({
                    where: { campaignId: campaign.id },
                    include: { campaign: true, user: true },
                    take,
                    skip,
                });
                const twitterPromiseArray = [];
                // const tiktokPromiseArray = [];
                const twitterPosts = [];
                // const tiktokPosts = [];
                for (const post of posts) {
                    const socialLink = await readPrisma.socialLink.findFirst({
                        where: { userId: post.user.id, type: post.type },
                    });
                    if (!socialLink) continue;
                    try {
                        if (socialLink.type === "twitter") {
                            twitterPromiseArray.push(TwitterClient.getPost(socialLink, post.id, false));
                            twitterPosts.push(post);
                        }
                        // if (socialLink?.type === "tiktok") {
                        //     tiktokPromiseArray.push(TikTokClient.getPosts(socialLink, [post.id]));
                        //     tiktokPosts.push(post);
                        // }
                    } catch (error) {}
                }

                console.log("TWITTER TOTAL PROMISES ---- ", twitterPromiseArray.length);
                // console.log("TIKTOK TOTAL PROMISES ---- ", tiktokPromiseArray.length);
                let fulfilledTwitterPromises = 0;
                let fulfilledTiktokPromises = 0;

                try {
                    const twitterResponses = await Promise.allSettled(twitterPromiseArray);
                    for (let twitterRespIndex = 0; twitterRespIndex < twitterResponses.length; twitterRespIndex++) {
                        const twitterResp = twitterResponses[twitterRespIndex];
                        const post = twitterPosts[twitterRespIndex];
                        if (twitterResp.status === "fulfilled") {
                            // console.log("preparing and updating social score.");
                            const responseJSON = JSON.parse(twitterResp.value);
                            const updatedPost = await updatePostMetrics(
                                new BN(responseJSON["favorite_count"]),
                                new BN(responseJSON["retweet_count"]),
                                post
                            );
                            console.log("UPDATING POST: ", updatedPost.id);
                            await prisma.socialPost.update({
                                where: {
                                    id_campaignId_userId: {
                                        id: updatedPost.id,
                                        campaignId: updatedPost.campaignId,
                                        userId: updatedPost.userId,
                                    },
                                },
                                data: {
                                    likes: updatedPost.likes,
                                    shares: updatedPost.shares,
                                },
                            });
                            fulfilledTwitterPromises += 1;
                        }
                    }
                } catch (error) {
                    console.log(error);
                }

                // try {
                //     const tiktokResponses = await Promise.allSettled(tiktokPromiseArray);
                //     for (let tiktokRespIndex = 0; tiktokRespIndex < tiktokResponses.length; tiktokRespIndex++) {
                //         const tiktokResp = tiktokResponses[tiktokRespIndex];
                //         const post = tiktokPosts[tiktokRespIndex];
                //         if (tiktokResp.status === "fulfilled") {
                //             // console.log("preparing and updating social score.");
                //             const postDetails = tiktokResp.value[0];
                //             const likeCount = postDetails.like_count;
                //             const shareCount = postDetails.share_count;
                //             const updatedPost = await updatePostMetrics(
                //                 new BN(likeCount) || 0,
                //                 new BN(shareCount) || 0,
                //                 post
                //             );
                //             postsToSave.push(updatedPost);
                //             fulfilledTiktokPromises += 1;
                //         }
                //     }
                // } catch (error) {
                //     console.log("there was an error making request to tiktok.");
                // }
                skip += take;
                console.log("FULFILLED TWITTER PROMISES ----.", fulfilledTwitterPromises);
                console.log("FULFILLED TIKTOK PROMISES ----.", fulfilledTiktokPromises);
            }
        }
    } catch (error) {
        console.log(error);
    }
    console.log("COMPLETED CRON TASKS ----.");
    await connection.close();
    console.log("DATABASE CONNECTION CLOSED ----.");
    process.exit(0);
})();
