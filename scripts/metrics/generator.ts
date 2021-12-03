import { BN } from '../../src/util/helpers';
import {
  checkFrequency,
  generateAlgorithm,
  generateCampaign,
  generateHourlyCampaignMetric,
  generateOrgIfNotFound,
  generateProfile, generateSocialLink,
  generateSocialPost,
  generateUniqueName,
  generateUser,
  getDailyFrequencies,
  getRandomInt,
  getRandomIntWithinRange,
  getTotalHours,
  incrementHour,
  updateCampaign,
  updateParticipant,
} from "../helpers";
import {Participant} from "../../src/models/Participant";
import {HourlyCampaignMetric} from "../../src/models/HourlyCampaignMetric";
import BigNumber from 'bignumber.js';
import {AlgorithmSpecs} from "../../src/types";
import {SocialPost} from "../../src/models/SocialPost";

export interface ParticipantMetrics {
  clickCount: BigNumber;
  viewCount: BigNumber;
  submissionCount: BigNumber;
  participationScore: BigNumber;
}
const CHUNK_VALUE = 9000;
export const main = async () => {
    const org = await generateOrgIfNotFound();
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate()-30);
    const endDate = new Date();
    endDate.setUTCDate(endDate.getUTCDate()+7);
    const previousCampaignNames: string[] = [];
    const previousUsernames: string[] = [];
    let hourlyPostsArray: SocialPost[] = [];
    for (let campaigns = 0; campaigns < 10; campaigns++) {
      let uniqueName = generateUniqueName();
      while (previousCampaignNames.find(name => name === uniqueName)) {
        uniqueName = generateUniqueName();
      }
      previousCampaignNames.push(uniqueName);
      const campaign = await generateCampaign(uniqueName, org, startDate, endDate).save();
      let hourlyMetricsArray: HourlyCampaignMetric[] = [];
      const totalParticipants = Number(getRandomIntWithinRange(100, 200));
      let totalParticipationScore = new BN(0);
      let participantCount = new BN(0);
      for (let participants = 0; participants < totalParticipants; participants++) {
        let uniqueUsername = generateUniqueName();
        while (previousUsernames.find(name => name === uniqueUsername)) {
          uniqueUsername = generateUniqueName();
        }
        previousUsernames.push(uniqueUsername);
        const profile = await generateProfile(uniqueUsername).save();
        const socialLink = await generateSocialLink().save();
        const user = await generateUser(profile, socialLink).save();
        const participant = await Participant.newParticipant(user, campaign).save();
        const participantMetrics: ParticipantMetrics = {
          clickCount: new BN(0),
          viewCount: new BN(0),
          submissionCount: new BN(0),
          participationScore: new BN(0)
        }
        let currentDate = campaign.beginDate;
        let dailyMetrics = getDailyFrequencies();
        const totalHours = getTotalHours(campaign.beginDate);
        for (let hours = 0; hours < totalHours; hours++) {
          if (checkFrequency(24, (hours+1))) {
            dailyMetrics = getDailyFrequencies();
          }
          let didPost = 0;
          let hourlyLikeCount = new BN(0);
          let hourlyShareCount = new BN(0);
          let hourlyCommentCount = new BN(0);
          let hourlyClickCount = checkFrequency((24/dailyMetrics.posts.frequency), (hours+1))  ?  new BN(getRandomInt(dailyMetrics.clicks.max)) : new BN(0);
          let hourlyViewCount = checkFrequency((24/dailyMetrics.views.frequency), (hours+1)) ?  new BN(getRandomInt(dailyMetrics.views.max)) : new BN(0);
          let hourlySubmissionCount = checkFrequency((24/dailyMetrics.submissions.frequency), (hours+1)) ?  new BN(getRandomInt(dailyMetrics.submissions.max)) : new BN(0);
          const hourlyParticipantCount = new BN(getRandomInt(10));
          participantCount = participantCount.plus(hourlyParticipantCount).isLessThan(totalParticipants) ? participantCount.plus(hourlyParticipantCount) : new BN(totalParticipants);
          participantMetrics.clickCount = participantMetrics.clickCount.plus(hourlyClickCount);
          participantMetrics.viewCount = participantMetrics.viewCount.plus(hourlyViewCount);
          participantMetrics.submissionCount = participantMetrics.submissionCount.plus(hourlySubmissionCount)
          participantMetrics.participationScore = participantMetrics.participationScore.plus(hourlyLikeCount).plus(hourlyShareCount).plus(hourlyCommentCount).plus(hourlyClickCount).plus(hourlyViewCount).plus(hourlySubmissionCount);
          totalParticipationScore = totalParticipationScore.plus(participantMetrics.participationScore);
          if (checkFrequency((24/dailyMetrics.posts.frequency), (hours+1)))  {
            didPost = 1;
            const likes = new BN(getRandomInt(dailyMetrics.posts.likes));
            const shares = new BN(getRandomInt(dailyMetrics.posts.shares));
            const comments = new BN(getRandomInt(dailyMetrics.posts.comments));
            const post = generateSocialPost({
              likes,
              shares,
              comments,
              participantId: participant.id,
              campaign,
              user
            });
            hourlyCommentCount = hourlyCommentCount.plus(comments);
            hourlyShareCount = hourlyShareCount.plus(shares);
            hourlyLikeCount = hourlyLikeCount.plus(likes);
            hourlyPostsArray.push(post);
          }
          if (hourlyMetricsArray.length < hours + 1) {
            hourlyMetricsArray.push(generateHourlyCampaignMetric({
              campaign: campaign,
              org: org,
              postCount: new BN(didPost),
              participantCount,
              clickCount: hourlyClickCount,
              viewCount: hourlyViewCount,
              submissionCount: hourlySubmissionCount,
              likeCount: hourlyLikeCount,
              shareCount: hourlyShareCount,
              commentCount: hourlyCommentCount,
              createdAt: currentDate
            }));
          } else {
            hourlyMetricsArray[hours].postCount = hourlyMetricsArray[hours].postCount.plus(didPost);
            hourlyMetricsArray[hours].participantCount = participantCount;
            hourlyMetricsArray[hours].clickCount = hourlyMetricsArray[hours].clickCount.plus(hourlyClickCount);
            hourlyMetricsArray[hours].viewCount = hourlyMetricsArray[hours].viewCount.plus(hourlyViewCount);
            hourlyMetricsArray[hours].submissionCount = hourlyMetricsArray[hours].submissionCount.plus(hourlySubmissionCount);
            hourlyMetricsArray[hours].likeCount = hourlyMetricsArray[hours].likeCount.plus(hourlyLikeCount);
            hourlyMetricsArray[hours].shareCount = hourlyMetricsArray[hours].shareCount.plus(hourlyShareCount);
            hourlyMetricsArray[hours].commentCount = hourlyMetricsArray[hours].commentCount.plus(hourlyCommentCount);
            hourlyMetricsArray[hours].createdAt = currentDate;
          }
          currentDate = incrementHour(currentDate);
        }
        await updateParticipant(participant.id, participantMetrics);
        console.log('CAMPAIGN NAME:', campaign.name, 'PARTICIPANT: #', participants+1, 'CAMPAIGN: #', campaigns+1, 'TOTAL PARTICIPANTS: ', totalParticipants);
      }
      const newAlgorithm = generateAlgorithm(totalParticipationScore) as AlgorithmSpecs;
      await updateCampaign(campaign.id, {algorithm: newAlgorithm, totalParticipationScore});
      console.log('SAVING HOURLY CAMPAIGN METRICS');
      await HourlyCampaignMetric.save(hourlyMetricsArray, {chunk: CHUNK_VALUE});
    }
    console.log('SAVING SOCIAL POSTS', hourlyPostsArray.length);
    await SocialPost.save(hourlyPostsArray, {chunk: CHUNK_VALUE});
};
