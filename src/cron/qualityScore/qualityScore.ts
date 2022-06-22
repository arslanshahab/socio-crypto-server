import { EngagementRate } from "./EngagementRate";
import { StandardDeviation } from "./StandardDeviation";
import { BigNumber } from "bignumber.js";
import { ParticipantEngagement } from "../../types";
import { BN } from "../../util";
import { prisma, readPrisma } from "../../clients/prisma";
// import { CampaignAuditStatus, CampaignStatus } from "src/util/constants";

const calculateQualityTier = (deviation: BigNumber, engagement: BigNumber, average: BigNumber) => {
    const scoreDeviation = engagement.minus(average).div(deviation);
    let tier;
    if (scoreDeviation.lt(-2) || scoreDeviation.gt(2)) {
        tier = 1;
    } else if (scoreDeviation.gte(-2) && scoreDeviation.lt(-1)) {
        tier = 2;
    } else if (scoreDeviation.gte(-1) && scoreDeviation.lt(1)) {
        tier = 3;
    } else if (scoreDeviation.gte(1) && scoreDeviation.lte(2)) {
        tier = 4;
    } else {
        tier = 0;
    }
    return new BN(tier);
};

export const main = async () => {
    // const currentDate = new Date();
    const campaigns = await readPrisma.campaign.findMany();

    for (const campaign of campaigns) {
        const likesEngagementData: BigNumber[] = [];
        const sharesEngagementData: BigNumber[] = [];
        const commentsEngagementData: BigNumber[] = [];
        const viewsEngagementData: BigNumber[] = [];
        const submissionEngagementData: BigNumber[] = [];
        const clickEngagementData: BigNumber[] = [];
        const participantEngagementRates: ParticipantEngagement[] = [];
        const totalParticipants = await readPrisma.participant.count({ where: { campaignId: campaign.id } });
        const take = 200;
        let skip = 0;
        const paginatedParticipantLoop = Math.ceil(totalParticipants / take);
        for (let pageIndex = 0; pageIndex < paginatedParticipantLoop; pageIndex++) {
            const participants = await readPrisma.participant.findMany({
                where: { campaignId: campaign.id },
                skip,
                take,
            });
            for (const participant of participants) {
                const user = await readPrisma.user.findFirst({ where: { id: participant.userId } });
                if (!user) throw new Error("User not found.");
                const { likeRate, commentRate, shareRate, clickRate } = await new EngagementRate(
                    participant,
                    campaign,
                    user
                ).social();
                const viewRate = new EngagementRate(participant, campaign, user).views();
                const submissionRate = new EngagementRate(participant, campaign, user).submissions();
                likesEngagementData.push(likeRate);
                sharesEngagementData.push(shareRate);
                commentsEngagementData.push(commentRate);
                viewsEngagementData.push(viewRate);
                submissionEngagementData.push(submissionRate);
                clickEngagementData.push(clickRate);
                participantEngagementRates.push({
                    participantId: participant.id,
                    shareRate,
                    likeRate,
                    commentRate,
                    viewRate,
                    submissionRate,
                    clickRate,
                });
            }
            const { standardDeviation: likesStandardDeviation, average: averageLikeRate } = new StandardDeviation(
                likesEngagementData
            ).calculate();
            const { standardDeviation: sharesStandardDeviation, average: averageShareRate } = new StandardDeviation(
                sharesEngagementData
            ).calculate();
            const { standardDeviation: commentsStandardDeviation, average: averageCommentRate } = new StandardDeviation(
                commentsEngagementData
            ).calculate();
            const { standardDeviation: viewsStandardDeviation, average: averageViewRate } = new StandardDeviation(
                viewsEngagementData
            ).calculate();
            const { standardDeviation: submissionsStandardDeviation, average: averageSubmissionRate } =
                new StandardDeviation(submissionEngagementData).calculate();
            const { standardDeviation: clicksStandardDeviation, average: averageClickRate } = new StandardDeviation(
                clickEngagementData
            ).calculate();
            for (const rate of participantEngagementRates) {
                const qualityScore = await readPrisma.qualityScore.findFirst({
                    where: { participantId: rate.participantId },
                });
                const likesTier = calculateQualityTier(likesStandardDeviation, rate.likeRate, averageLikeRate);
                const sharesTier = calculateQualityTier(sharesStandardDeviation, rate.shareRate, averageShareRate);
                const commentsTier = calculateQualityTier(
                    commentsStandardDeviation,
                    rate.commentRate,
                    averageCommentRate
                );
                const viewsTier = calculateQualityTier(viewsStandardDeviation, rate.viewRate, averageViewRate);
                const submissionsTier = calculateQualityTier(
                    submissionsStandardDeviation,
                    rate.submissionRate,
                    averageSubmissionRate
                );
                const clicksTier = calculateQualityTier(clicksStandardDeviation, rate.clickRate, averageClickRate);
                if (qualityScore) {
                    await prisma.qualityScore.update({
                        where: { id: qualityScore?.id || "" },
                        data: {
                            likes: likesTier.toString(),
                            shares: sharesTier.toString(),
                            comments: commentsTier.toString(),
                            views: viewsTier.toString(),
                            submissions: submissionsTier.toString(),
                            clicks: clicksTier.toString(),
                        },
                    });
                } else {
                    await prisma.qualityScore.create({
                        data: {
                            participantId: rate.participantId,
                            likes: likesTier.toString(),
                            shares: sharesTier.toString(),
                            comments: commentsTier.toString(),
                            views: viewsTier.toString(),
                            submissions: submissionsTier.toString(),
                            clicks: clicksTier.toString(),
                        },
                    });
                }
            }
            skip += take;
        }
    }
};
