import { Firebase } from "../../clients/firebase";
import { BN } from "../../util";
import * as campaignController from "../../controllers/campaign";
import { prisma } from "../../clients/prisma";
import { CampaignStatus } from "../../util/constants";
import { getTokenValueInUSD } from "../../util/exchangeRate";

/**
 * {
 *   "campaignId": {
 *      "participantId": rank
 *   }
 * }
 */
const campaignLeaderboards: { [key: string]: { [key: string]: number } } = {};
const campaignInformation: { [key: string]: { currentTotal: number; currentTier: number } } = {};

const getUserTotalParticipationScore = async (userId: string) => {
    const participations = await prisma.participant.findMany({ where: { userId } });
    const totalScore = participations
        .map((item) => parseFloat(item.participationScore || "0"))
        .reduce((sum, item) => sum + item, 0);
    return totalScore;
};

export const main = async () => {
    const metricsToSave = [];

    const totalUsers = await prisma.user.count();
    const take = 200;
    let skip = 0;
    const paginatedUsersLoop = Math.ceil(totalUsers / take);

    for (let pageIndex = 0; pageIndex < paginatedUsersLoop; pageIndex++) {
        const users = await prisma.user.findMany({ include: { profile: true }, skip, take });
        for (const user of users) {
            const totalParticipationScore = await getUserTotalParticipationScore(user.id);
            metricsToSave.push({ score: totalParticipationScore.toString(), userId: user.id });
            const notificationSettings = await prisma.notificationSettings.findFirst({ where: { userId: user.id } });
            const participations = await prisma.participant.findMany({ where: { userId: user.id } });
            try {
                if (notificationSettings?.campaignUpdates && participations?.length) {
                    const campaignIds = participations.map((item) => item.campaignId);

                    const openCampaigns = await prisma.campaign.findMany({
                        where: {
                            id: { in: campaignIds },
                            endDate: { gte: new Date() },
                            status: CampaignStatus.APPROVED,
                        },
                    });
                    for (const campaign of openCampaigns) {
                        const participant = participations.find((item) => item.campaignId === campaign.id);
                        const totalParticipants = await prisma.participant.count({
                            where: { campaignId: campaign.id },
                        });
                        if (!campaignLeaderboards[campaign.id]) {
                            campaignLeaderboards[campaign.id] = {};
                            const sortedParticipants = await prisma.participant.findMany({
                                where: { campaignId: campaign.id },
                                orderBy: { participationScore: "desc" },
                            });
                            sortedParticipants.forEach((part, idx) => {
                                campaignLeaderboards[campaign.id][part.id] = idx + 1;
                            });
                        }
                        if (!campaignInformation[campaign.id])
                            campaignInformation[campaign.id] = await campaignController.getCurrentCampaignTier(null, {
                                campaignId: campaign.id,
                            });
                        const latestParticipation = await prisma.dailyParticipantMetric.findFirst({
                            where: { participantId: participant?.id },
                        });
                        if (latestParticipation && new BN(latestParticipation.participationScore).gt(0)) {
                            const percentageOfParticipation = new BN(latestParticipation.participationScore).div(
                                campaign.totalParticipationScore
                            );
                            const currentTotal = campaignInformation[campaign.id].currentTotal;

                            if (campaign.type == "crypto") {
                                const campaignCurrency = await prisma.currency.findFirst({
                                    where: { id: campaign.currencyId || "" },
                                });
                                const campaignToken = await prisma.token.findFirst({
                                    where: { id: campaignCurrency?.tokenId || "" },
                                });
                                const tokenPrice = await getTokenValueInUSD(
                                    campaignToken?.symbol || "",
                                    parseFloat(campaign.coiinTotal)
                                );
                                return await Firebase.sendDailyParticipationUpdate(
                                    user?.profile?.deviceToken || "",
                                    campaign.name,
                                    percentageOfParticipation.times(currentTotal).times(tokenPrice).times(10), // value in coiin
                                    new BN(latestParticipation.participationScore),
                                    campaignLeaderboards[campaign.id][participant?.id || ""],
                                    totalParticipants
                                );
                            } else {
                                await Firebase.sendDailyParticipationUpdate(
                                    user?.profile?.deviceToken || "",
                                    campaign.name,
                                    percentageOfParticipation.times(currentTotal),
                                    new BN(latestParticipation.participationScore),
                                    campaignLeaderboards[campaign.id][participant?.id || ""],
                                    totalParticipants
                                );
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("error sending out notification");
                console.error(error);
            }
        }
        skip += take;
    }

    return await prisma.twentyFourHourMetric.createMany({ data: metricsToSave });
};
