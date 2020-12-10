import {Campaign} from "../../models/Campaign";
import {EngagementRate} from "./EngagementRate";
import {StandardDeviation} from "./StandardDeviation";
import {BigNumber} from "bignumber.js";
import {ParticipantEngagement} from "../../types";
import {QualityScore} from "../../models/QualityScore";
import { BN } from '../../util/helpers';

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
    tier = 0
  }
  return new BN(tier);
}

export const main = async () => {
  const campaigns = await Campaign.find({relations: ['participants']});

  for (const campaign of campaigns) {
    const likesEngagementData: BigNumber[] = []
    const sharesEngagementData: BigNumber[] = []
    const commentsEngagementData: BigNumber[] = []
    const viewsEngagementData: BigNumber[] = [];
    const submissionEngagementData: BigNumber[] = [];
    const clickEngagementData: BigNumber[] = [];
    const participantEngagementRates: ParticipantEngagement[] = [];
    for (const participant of campaign.participants) {
      const {likeRate, commentRate, shareRate, clickRate} = await new EngagementRate(participant).social();
      const viewRate = new EngagementRate(participant).views();
      const submissionRate = new EngagementRate(participant).submissions();
      likesEngagementData.push(likeRate)
      sharesEngagementData.push(shareRate)
      commentsEngagementData.push(commentRate)
      viewsEngagementData.push(viewRate);
      submissionEngagementData.push(submissionRate)
      clickEngagementData.push(clickRate);
      participantEngagementRates.push({
        participantId: participant.id,
        shareRate,
        likeRate,
        commentRate,
        viewRate,
        submissionRate,
        clickRate
      })
    }
    const {
      standardDeviation: likesStandardDeviation,
      average: averageLikeRate,
    } = new StandardDeviation(likesEngagementData).calculate();
    const {
      standardDeviation: sharesStandardDeviation,
      average: averageShareRate
    } = new StandardDeviation(sharesEngagementData).calculate();
    const {
      standardDeviation: commentsStandardDeviation,
      average: averageCommentRate
    } = new StandardDeviation(commentsEngagementData).calculate();
    const {
      standardDeviation: viewsStandardDeviation,
      average: averageViewRate
    } = new StandardDeviation(viewsEngagementData).calculate();
    const {
      standardDeviation: submissionsStandardDeviation,
      average: averageSubmissionRate
    } = new StandardDeviation(submissionEngagementData).calculate()
    const {
      standardDeviation: clicksStandardDeviation,
      average: averageClickRate
    } = new StandardDeviation(clickEngagementData).calculate()
    for (const rate of participantEngagementRates) {
      let qualityScore = await QualityScore.findOne({where: {participantId: rate.participantId}});
      if (!qualityScore) {
        qualityScore = QualityScore.newQualityScore(rate.participantId);
      }
      const likesTier = calculateQualityTier(likesStandardDeviation, rate.likeRate, averageLikeRate);
      const sharesTier = calculateQualityTier(sharesStandardDeviation, rate.shareRate, averageShareRate);
      const commentsTier = calculateQualityTier(commentsStandardDeviation, rate.commentRate, averageCommentRate);
      const viewsTier = calculateQualityTier(viewsStandardDeviation, rate.viewRate, averageViewRate);
      const submissionsTier = calculateQualityTier(submissionsStandardDeviation, rate.submissionRate, averageSubmissionRate);
      const clicksTier = calculateQualityTier(clicksStandardDeviation, rate.clickRate, averageClickRate);
      qualityScore.likes = likesTier;
      qualityScore.shares = sharesTier;
      qualityScore.comments = commentsTier;
      qualityScore.views = viewsTier;
      qualityScore.submissions = submissionsTier;
      qualityScore.clicks = clicksTier;
      await qualityScore.save();
    }
  }
};
