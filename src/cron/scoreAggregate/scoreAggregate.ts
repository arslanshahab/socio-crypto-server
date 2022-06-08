import { getConnection } from "typeorm";
import { Firebase } from "../../clients/firebase";
import { BN } from "../../util";
import * as campaignController from "../../controllers/campaign";
import { getTokenPriceInUsd } from "../../clients/ethereum";
import { prisma } from "../../clients/prisma";

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
        const users = await prisma.user.findMany({ skip, take });
        for (const user of users) {
            const totalParticipationScore = await getUserTotalParticipationScore(user.id);
            metricsToSave.push({ score: totalParticipationScore, userId: user.id });
            const notificationSettings = await prisma.notificationSettings.findFirst({ where: { userId: user.id } });
            try {
                if (user.notificationSettings.campaignUpdates && user.campaigns) {
                    const openCampaigns = user.campaigns.filter(
                        (participant: Participant) => participant.campaign && participant.campaign.isOpen()
                    );
                    for (const participant of openCampaigns) {
                        if (!campaignLeaderboards[participant.campaign.id]) {
                            campaignLeaderboards[participant.campaign.id] = {};
                            const sortedParticipants = participant.campaign.participants.sort(
                                (a: Participant, b: Participant) =>
                                    parseFloat(b.participationScore.minus(a.participationScore).toString())
                            );
                            sortedParticipants.forEach((part, idx) => {
                                campaignLeaderboards[participant.campaign.id][part.id] = idx + 1;
                            });
                        }
                        if (!campaignInformation[participant.campaign.id])
                            campaignInformation[participant.campaign.id] =
                                await campaignController.getCurrentCampaignTier(null, {
                                    campaignId: participant.campaign.id,
                                });
                        const latestParticipation = await DailyParticipantMetric.getLatestByParticipantId(
                            participant.id
                        );
                        if (latestParticipation && latestParticipation.participationScore.gt(0)) {
                            const percentageOfParticipation = new BN(latestParticipation.participationScore).div(
                                participant.campaign.totalParticipationScore
                            );
                            const currentTotal = campaignInformation[participant.campaign.id].currentTotal;

                            if (participant.campaign.type == "crypto") {
                                const tokenPrice =
                                    participant.campaign.crypto.type === "coiin"
                                        ? 0.1
                                        : await getTokenPriceInUsd(participant.campaign.crypto.type);
                                return await Firebase.sendDailyParticipationUpdate(
                                    user.profile.deviceToken,
                                    participant.campaign,
                                    percentageOfParticipation.times(currentTotal).times(tokenPrice).times(10), // value in coiin
                                    latestParticipation.participationScore,
                                    campaignLeaderboards[participant.campaign.id][participant.id],
                                    participant.campaign.participants.length
                                );
                            } else {
                                await Firebase.sendDailyParticipationUpdate(
                                    user.profile.deviceToken,
                                    participant.campaign,
                                    percentageOfParticipation.times(currentTotal),
                                    latestParticipation.participationScore,
                                    campaignLeaderboards[participant.campaign.id][participant.id],
                                    participant.campaign.participants.length
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

    await getConnection().createEntityManager().save(metricsToSave);
    return;
};
