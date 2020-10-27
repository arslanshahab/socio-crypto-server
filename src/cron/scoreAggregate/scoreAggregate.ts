import {getConnection} from "typeorm";
import { Firebase } from '../../clients/firebase';
import {User} from '../../models/User';
import { TwentyFourHourMetric } from '../../models/TwentyFourHourMetric';
import { DailyParticipantMetric } from '../../models/DailyParticipantMetric';
import { Participant } from '../../models/Participant';
import { BN } from '../../util/helpers';
import * as campaignController from '../../controllers/campaign';

/**
 * {
 *   "campaignId": {
 *      "participantId": rank
 *   }
 * }
 */
const campaignLeaderboards: {[key: string]: {[key: string]: number}} = {};
const campaignInformation: {[key: string]: {currentTotal: number, currentTier: number}} = {};

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
        const openCampaigns = user.campaigns.filter((participant: Participant) => participant.campaign && participant.campaign.isOpen());
        for (const participant of openCampaigns) {
          if (!campaignLeaderboards[participant.campaign.id]) {
            campaignLeaderboards[participant.campaign.id] = {};
            const sortedParticipants = participant.campaign.participants.sort((a: Participant, b: Participant) => parseFloat((b.participationScore.minus(a.participationScore).toString())));
            sortedParticipants.forEach((part, idx) => {
              campaignLeaderboards[participant.campaign.id][part.id] = idx+1;
            });
          }
          if (!campaignInformation[participant.campaign.id]) campaignInformation[participant.campaign.id] = await campaignController.getCurrentCampaignTier({ campaignId: participant.campaign.id });
          const latestParticipation = await DailyParticipantMetric.getLatestByParticipantId(participant.id);
          if (latestParticipation && latestParticipation.participationScore.gt(0)) {
            const percentageOfParticipation = new BN(latestParticipation.participationScore).div(participant.campaign.totalParticipationScore);
            const coiinTotal = campaignInformation[participant.campaign.id].currentTotal;
            await Firebase.sendDailyParticipationUpdate(
              user.profile.deviceToken,
              participant.campaign,
              percentageOfParticipation.times(coiinTotal),
              latestParticipation.participationScore,
              campaignLeaderboards[participant.campaign.id][participant.id],
              participant.campaign.participants.length,
            );
          }
        }
      }
    } catch (error) {
      console.error('error sending out notification');
      console.error(error);
    }
  }

  await getConnection().createEntityManager().save(metricsToSave);
  return;
}