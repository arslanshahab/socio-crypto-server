import { EngagementRate } from "./EngagementRate";
import { StandardDeviation } from "./StandardDeviation";
import { BigNumber } from "bignumber.js";
import { ParticipantEngagement } from "types.d.ts";
import { prisma, readPrisma } from "../../clients/prisma";
// import { createObjectCsvWriter } from "csv-writer";
import { calculateQualityTier } from "../../util/index";

export const main = async () => {
    const campaigns = await readPrisma.campaign.findMany();
    // const csvWriter = createObjectCsvWriter({
    //     path: "quality-score.csv",
    //     header: [
    //         { id: "participantId", title: "participantId" },
    //         { id: "likeRate", title: "likeRate" },
    //         { id: "commentRate", title: "commentRate" },
    //         { id: "shareRate", title: "shareRate" },
    //         { id: "clickRate", title: "clickRate" },
    //         { id: "viewRate", title: "viewRate" },
    //         { id: "submissionRate", title: "submissionRate" },
    //         { id: "likesStandardDeviation", title: "likesStandardDeviation" },
    //         { id: "sharesStandardDeviation", title: "sharesStandardDeviation" },
    //         { id: "commentsStandardDeviation", title: "commentsStandardDeviation" },
    //         { id: "viewsStandardDeviation", title: "viewsStandardDeviation" },
    //         { id: "submissionsStandardDeviation", title: "submissionsStandardDeviation" },
    //         { id: "clicksStandardDeviation", title: "clicksStandardDeviation" },
    //         { id: "likesTier", title: "likesTier" },
    //         { id: "sharesTier", title: "sharesTier" },
    //         { id: "commentsTier", title: "commentsTier" },
    //         { id: "viewsTier", title: "viewsTier" },
    //         { id: "submissionsTier", title: "submissionsTier" },
    //         { id: "clicksTier", title: "clicksTier" },
    //     ],
    // });
    // const csvData = [];

    for (const campaign of campaigns) {
        const likesEngagementData: BigNumber[] = [];
        const sharesEngagementData: BigNumber[] = [];
        const commentsEngagementData: BigNumber[] = [];
        const viewsEngagementData: BigNumber[] = [];
        const submissionEngagementData: BigNumber[] = [];
        const clickEngagementData: BigNumber[] = [];
        const participantEngagementRates: ParticipantEngagement[] = [];
        const totalParticipants = await readPrisma.participant.count({
            where: { campaignId: campaign.id, blacklist: false },
        });
        const take = 200;
        let skip = 0;
        const paginatedParticipantLoop = Math.ceil(totalParticipants / take);
        for (let pageIndex = 0; pageIndex < paginatedParticipantLoop; pageIndex++) {
            const participants = await readPrisma.participant.findMany({
                where: { campaignId: campaign.id, blacklist: false },
                skip,
                take,
            });
            let prismaTransactions = [];
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
                console.log(
                    likeRate.toNumber(),
                    commentRate.toNumber(),
                    shareRate.toNumber(),
                    clickRate.toNumber(),
                    viewRate.toNumber(),
                    submissionRate.toNumber()
                );
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
                // csvData.push({
                //     participantId: rate.participantId,
                //     likeRate: rate.likeRate.toString(),
                //     commentRate: rate.commentRate.toString(),
                //     shareRate: rate.shareRate.toString(),
                //     clickRate: rate.clickRate.toString(),
                //     viewRate: rate.viewRate.toString(),
                //     submissionRate: rate.submissionRate.toString(),
                //     likesStandardDeviation: likesStandardDeviation.toString(),
                //     sharesStandardDeviation: sharesStandardDeviation.toString(),
                //     commentsStandardDeviation: commentsStandardDeviation.toString(),
                //     viewsStandardDeviation: viewsStandardDeviation.toString(),
                //     submissionsStandardDeviation: submissionsStandardDeviation.toString(),
                //     clicksStandardDeviation: clicksStandardDeviation.toString(),
                //     likesTier: likesTier.toString(),
                //     sharesTier: sharesTier.toString(),
                //     commentsTier: commentsTier.toString(),
                //     viewsTier: viewsTier.toString(),
                //     submissionsTier: submissionsTier.toString(),
                //     clicksTier: clicksTier.toString(),
                // });
                prismaTransactions.push(
                    prisma.qualityScore.upsert({
                        where: { id: qualityScore?.id || rate.participantId },
                        update: {
                            likes: likesTier.toString(),
                            shares: sharesTier.toString(),
                            comments: commentsTier.toString(),
                            views: viewsTier.toString(),
                            submissions: submissionsTier.toString(),
                            clicks: clicksTier.toString(),
                        },
                        create: {
                            participantId: rate.participantId,
                            likes: likesTier.toString(),
                            shares: sharesTier.toString(),
                            comments: commentsTier.toString(),
                            views: viewsTier.toString(),
                            submissions: submissionsTier.toString(),
                            clicks: clicksTier.toString(),
                        },
                    })
                );
                console.log("QUALITY SCORE RUN --- ", rate.participantId);
            }
            skip += take;
            console.log("PROMISES - ", prismaTransactions.length);
            await prisma.$transaction(prismaTransactions);
            prismaTransactions.splice(0, take);
        }
    }
    // try {
    //     await csvWriter.writeRecords(csvData);
    //     console.log("The CSV file was written successfully");
    // } catch (error) {
    //     console.log(error);
    // }
};
