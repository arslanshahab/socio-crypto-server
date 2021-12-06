import { getConnection } from "typeorm";
import { Firebase } from "../../clients/firebase";
import { User } from "../../models/User";
import { TwentyFourHourMetric } from "../../models/TwentyFourHourMetric";
import { DailyParticipantMetric } from "../../models/DailyParticipantMetric";
import { Participant } from "../../models/Participant";
import { BN } from "../../util/helpers";
import * as campaignController from "../../controllers/campaign";
import { getTokenPriceInUsd } from "clients/ethereum";

/**
 * {
 *   "campaignId": {
 *      "participantId": rank
 *   }
 * }
 */
const campaignLeaderboards: { [key: string]: { [key: string]: number } } = {};
const campaignInformation: { [key: string]: { currentTotal: number; currentTier: number } } = {};

export const main = async () => {
    const metricsToSave: TwentyFourHourMetric[] = [];

    const users = await User.getUsersForDailyMetricsCron();

    for (const user of users) {
        const totalParticipationScore = await User.getUserTotalParticipationScore(user.id);
        const metric = new TwentyFourHourMetric();
        metric.score = totalParticipationScore;
        metric.user = user;
        metricsToSave.push(metric);

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
                        campaignInformation[participant.campaign.id] = await campaignController.getCurrentCampaignTier(
                            null,
                            { campaignId: participant.campaign.id }
                        );
                    const latestParticipation = await DailyParticipantMetric.getLatestByParticipantId(participant.id);
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

    await getConnection().createEntityManager().save(metricsToSave);
    return;
};
