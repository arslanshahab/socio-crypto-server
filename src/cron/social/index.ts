import { TwitterClient } from "../../clients/twitter";
import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import { BigNumber } from "bignumber.js";
import { BN, calculateQualityTierMultiplier } from "../../util";
import * as dotenv from "dotenv";
import { SocialPost, Prisma, PrismaPromise } from "@prisma/client";
import { prisma, readPrisma } from "../../clients/prisma";
import { CampaignStatus, CampaignAuditStatus, SocialClientType } from "../../util/constants";
import { DragonchainCampaignActionLedgerPayload, PointValueTypes } from "types.d.ts";
import { QualityScoreService } from "../../services/QualityScoreService";
import { DailyParticipantMetricService } from "../../services/DailyParticipantMetricService";
import { ParticipantAction } from "../../util/constants";
// import { HourlyCampaignMetricsService } from "../../services/HourlyCampaignMetricsService";
import { DragonChainService } from "../../services/DragonChainService";
import { Dragonchain } from "../../clients/dragonchain";
import { SocialLinkService } from "../../services/SocialLinkService";
import { SlackClient } from "../../clients/slack";

dotenv.config();
const app = new Application();
const qualityScoreService = new QualityScoreService();
const dailyParticipantMetricService = new DailyParticipantMetricService();
// const hourlyCampaignMetricService = new HourlyCampaignMetricsService();
const dragonChainService = new DragonChainService();
const socialLinkService = new SocialLinkService();

const updatePostMetrics = async (likes: BigNumber, shares: BigNumber, post: SocialPost) => {
    const participant = await readPrisma.participant.findFirst({
        where: { campaignId: post.campaignId, userId: post.userId },
    });
    if (!participant) throw new Error("participant not found");
    const campaign = await readPrisma.campaign.findFirst({ where: { id: post.campaignId }, include: { org: true } });
    if (!campaign) throw new Error("campaign not found");
    const user = await readPrisma.user.findFirst({ where: { id: post.userId } });
    if (!user) throw new Error("user not found");
    const qualityScore = await qualityScoreService.findByParticipantOrCreate(participant.id);
    const likesMultiplier = calculateQualityTierMultiplier(new BN(qualityScore.likes));
    const sharesMultiplier = calculateQualityTierMultiplier(new BN(qualityScore.shares));
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
    post.likes = likes.toString();
    post.shares = shares.toString();
    const promiseArray: Promise<any>[] = [];
    promiseArray.push(
        prisma.participant.update({
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
        })
    );
    promiseArray.push(
        prisma.campaign.update({
            data: {
                totalParticipationScore: newTotalCampaignScore.toString(),
            },
            where: {
                id: campaign.id || "",
            },
        })
    );
    // promiseArray.push(
    //     hourlyCampaignMetricService.upsertMetrics(campaign.id, campaign.org?.id!, "likes", adjustedRawLikes)
    // );
    // promiseArray.push(
    //     hourlyCampaignMetricService.upsertMetrics(campaign.id, campaign.org?.id!, "shares", adjustedRawShares)
    // );

    await dailyParticipantMetricService.upsertMetrics({
        user,
        campaign,
        participant,
        action: ParticipantAction.LIKES,
        additiveParticipationScore: likesAdjustedScore,
        actionCount: likes.toNumber(),
    });

    await dailyParticipantMetricService.upsertMetrics({
        user,
        campaign,
        participant,
        action: ParticipantAction.SHARES,
        additiveParticipationScore: sharesAdjustedScore,
        actionCount: shares.toNumber(),
    });
    await Promise.all(promiseArray);
    return post;
};

(async () => {
    console.log("STARTING CRON.");
    await Secrets.initialize();
    await Dragonchain.initialize();
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
            const take = 100;
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
                    // const socialLink = await readPrisma.socialLink.findFirst({
                    //     where: { userId: post.user.id, type: post.type },
                    // });
                    const socialLink = await socialLinkService.findSocialLinkByUserAndType(post.user.id, post.type);
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
                // let fulfilledTiktokPromises = 0;
                const prismaTransactions: PrismaPromise<SocialPost>[] = [];
                const dragonchainTransactionList: DragonchainCampaignActionLedgerPayload[] = [];

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
                            console.log(
                                "UPDATING POST: ",
                                updatedPost.id,
                                post.likes,
                                post.shares,
                                " :----: ",
                                updatedPost.likes,
                                updatedPost.shares
                            );
                            prismaTransactions.push(
                                prisma.socialPost.update({
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
                                })
                            );
                            fulfilledTwitterPromises += 1;

                            // prepare transaction data to log on dragon chain
                            const prevLikes = parseFloat(post.likes);
                            const currLikes = parseFloat(updatedPost.likes);
                            const likeDiff = currLikes - prevLikes;
                            if ((prevLikes || currLikes) && likeDiff) {
                                dragonchainTransactionList.push({
                                    action: ParticipantAction.LIKES,
                                    socialType: SocialClientType.TWITTER,
                                    campaignId: post.campaignId,
                                    participantId: post.participantId,
                                    payload: { likes: likeDiff },
                                });
                            }
                            const prevShares = parseFloat(post.shares);
                            const currShares = parseFloat(updatedPost.shares);
                            const shareDiff = currShares - prevShares;
                            if ((prevShares || currShares) && shareDiff) {
                                dragonchainTransactionList.push({
                                    action: ParticipantAction.SHARES,
                                    socialType: SocialClientType.TWITTER,
                                    campaignId: post.campaignId,
                                    participantId: post.participantId,
                                    payload: { shares: shareDiff },
                                });
                            }
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
                // console.log("FULFILLED TIKTOK PROMISES ----.", fulfilledTiktokPromises);
                console.log("PRISMA PROMISES ----.", prismaTransactions.length);
                console.log("DRAGONCHAIN TRANSACTIONS ----.", dragonchainTransactionList.length);
                await prisma.$transaction(prismaTransactions);
                await dragonChainService.ledgerBulkCampaignAction(dragonchainTransactionList);
            }
        }
    } catch (error) {
        console.log(error);
        await SlackClient.sendNotification({ name: "Social Metrics Cron", error: error });
        console.log("EXITING BECAUSE OF AN ERROR ----.");
        await connection.close();
        console.log("DATABASE CONNECTION CLOSED ----.");
        process.exit(0);
    }
    console.log("COMPLETED CRON TASKS ----.");
    await connection.close();
    console.log("DATABASE CONNECTION CLOSED ----.");
    process.exit(0);
})();
