import {SocialPost} from "../models/SocialPost";
import {Tiers, AggregateDailyMetrics} from "../types";
import {Participant} from "../models/Participant";
import {Campaign} from "../models/Campaign";
import { getConnection } from 'typeorm';
import { Wallet } from '../models/Wallet';
import { BN, generateRandomNumber } from '../util/helpers';
import { BigNumber } from 'bignumber.js';
import { DailyParticipantMetric } from '../models/DailyParticipantMetric';

export const shuffle = (a: any[]) => {
  for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const calculateRaffleWinner = (totalParticipationScore: BigNumber, participants: Participant[], currentRun = 1): Participant => {
  if (currentRun > 5) throw new Error('no winner found in 5 runs. Try again');
  const sumOfWeights = totalParticipationScore;
  let rand = generateRandomNumber(sumOfWeights.toNumber());
  const numberOfChoices = participants.length;
  const shuffledParticipants = shuffle(participants);
  for (let i = 0; i < numberOfChoices; i++) {
    const participant = shuffledParticipants[i];
    if (rand < participant.participationScore.toNumber()) {
      return participant;
    }
    rand -= participant.participationScore.toNumber();
  }
  return calculateRaffleWinner(totalParticipationScore, shuffledParticipants, currentRun+1);
}

export const calculateParticipantSocialScore = async (participant: Participant, campaign: Campaign) => {
    const socialPosts = await SocialPost.find({where: {participantId: participant.id}});
    let totalLikes = new BN(0);
    let totalShares = new BN(0);
    socialPosts.forEach(post => {
        totalLikes = totalLikes.plus(post.likes);
        totalShares = totalShares.plus(post.shares);
    });
    return {
        totalLikes,
        totalShares,
        likesScore: totalLikes.multipliedBy(campaign.algorithm.pointValues.likes),
        shareScore: totalShares.multipliedBy(campaign.algorithm.pointValues.shares)
    };
}

export const calculateTier = (totalParticipation: BigNumber, tiers: Tiers) => {
    let currentTier = 1;
    let currentTotal = new BN(1);
    const numOfTiers = Object.keys(tiers).reduce((accum: number, value: any) => {
        if ((tiers[value].threshold as any) !== "" && (tiers[value].totalCoiins as any) !== "") {
            accum++;
        }
        return accum;
    }, 0);
    if (totalParticipation.isGreaterThan(tiers[numOfTiers].threshold)) {
        currentTier = numOfTiers;
        currentTotal = tiers[numOfTiers].totalCoiins;
        return { currentTotal, currentTier };
    }
    for(let key in tiers) {
        if (totalParticipation.isLessThan(tiers[key].threshold) || !tiers[key].threshold) {
            if (Number(key) < 2) {
                currentTier = 1;
                currentTotal = tiers['1'].totalCoiins;
                return { currentTier, currentTotal };
            } else {
                const previousTier = Number(key) - 1;
                currentTier = previousTier;
                currentTotal = tiers[String(previousTier)].totalCoiins;
                return { currentTier, currentTotal };
            }
        }
    }

    return { currentTier, currentTotal };
}

export const calculateParticipantPayout = async (currentCampaignTierTotal: BigNumber, campaign: Campaign, participant: Participant) => {
    if (campaign.totalParticipationScore.eq(new BN(0))) return new BN(0);
    const percentageOfTotalParticipation = new BN(participant.participationScore).div(campaign.totalParticipationScore);
    return currentCampaignTierTotal.multipliedBy(percentageOfTotalParticipation);
}

export const calculateParticipantPayoutFromDailyParticipation = (currentCampaignTierTotal: BigNumber, campaign: Campaign, metrics: AggregateDailyMetrics) => {
  if (campaign.totalParticipationScore.eq(new BN(0))) return new BN(0);
  const viewScore = campaign.algorithm.pointValues.views.times(metrics.viewCount);
  const clickScore = campaign.algorithm.pointValues.clicks.times(metrics.clickCount);
  const submissionScore = campaign.algorithm.pointValues.submissions.times(metrics.submissionCount);
  const likesScore = campaign.algorithm.pointValues.likes.times(metrics.likeCount);
  const sharesScore = campaign.algorithm.pointValues.shares.times(metrics.shareCount);
  const totalParticipantPoints = viewScore.plus(clickScore).plus(submissionScore).plus(likesScore).plus(sharesScore);
  const percentageOfTotalParticipation = totalParticipantPoints.div(campaign.totalParticipationScore);
  return currentCampaignTierTotal.multipliedBy(percentageOfTotalParticipation);
}

export const performTransfer = async (walletId: string, amount: string, action: 'credit' | 'debit') => {
  if (new BN(amount).lte(0)) throw new Error("Amount must be a positive number");
  return getConnection().transaction(async transactionalEntitymanager => {
    const wallet = await transactionalEntitymanager.findOne(Wallet, { where: { id: walletId } });
    if (!wallet) throw new Error('wallet not found');
    switch (action) {
      case 'credit':
        wallet.balance = wallet.balance.plus(amount);
        break;
      case 'debit':
        wallet.balance = wallet.balance.minus(amount);
        if (wallet.balance.lt(0)) throw new Error("wallet does not have the necessary funds to complete this action");
        break;
      default:
        throw new Error(`transfer method ${action} not provided`);
    }
    await transactionalEntitymanager.save(wallet);
  });
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export const getDatesBetweenDates = (date1: Date, date2: Date) => {
  const dateArray = [];
  let currentDate = new Date(date1);
  while (currentDate <= new Date(date2)) {
    dateArray.push(new Date(currentDate).toUTCString());
    currentDate = addDays(currentDate, 1);
  }
  if (dateArray.length > 0) dateArray.splice(0, 1);
  return dateArray;
}

export const wait = async (delayInMs: number, func: any) => {
    setTimeout(async () => {
        await func();
    }, delayInMs)
}

export const sleep = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const groupDailyMetricsByUser = async (userId: string, metrics: DailyParticipantMetric[]) => {
  const alreadyHandledParticipants: {[key: string]: any} = {};
  const modifiedMetrics = metrics.reduce((accum: {[key: string]: any}, current: DailyParticipantMetric) => {
    if (!alreadyHandledParticipants[current.participantId]) {
      if (!accum[current.campaign.id]) accum[current.campaign.id] = {
        totalParticipation: current.totalParticipationScore.toString(),
        campaign: current.campaign,
        metrics: [current],
        participationScore: current.user.id === userId && current.participationScore.toString(),
      };
      else {
        accum[current.campaign.id].totalParticipation = new BN(accum[current.campaign.id].totalParticipation).plus(current.totalParticipationScore).toString();
        accum[current.campaign.id].metrics.push(current);
        if (current.user.id === userId) accum[current.campaign.id].participationScore = current.participationScore.toString();
      }
      alreadyHandledParticipants[current.participantId] = 1;
    }
    return accum;
  }, {});
  for (let i = 0; i < Object.keys(modifiedMetrics).length; i++) {
    const campaignId = Object.keys(modifiedMetrics)[i];
    const tierInformation = calculateTier(new BN(modifiedMetrics[campaignId].totalParticipation), modifiedMetrics[campaignId].campaign.algorithm.tiers);
    const myParticipation = modifiedMetrics[campaignId].metrics.find((metric: DailyParticipantMetric) => metric.user.id === userId);
    modifiedMetrics[campaignId]['rank'] = getRank(userId, modifiedMetrics[campaignId].metrics);
    modifiedMetrics[campaignId]['tier'] = tierInformation['currentTier'];
    modifiedMetrics[campaignId]['prospectivePayout'] = (myParticipation) ? await calculateParticipantPayoutFromDailyParticipation(new BN(tierInformation.currentTier), modifiedMetrics[campaignId].campaign, await DailyParticipantMetric.getAggregatedMetrics(myParticipation.participantId)).toString() : '0';
  }
  return modifiedMetrics;
}

export const getRank = (userId: string, metrics: DailyParticipantMetric[]) => {
  let rank = -1;
  const sortedMetrics = metrics.sort((a: DailyParticipantMetric, b: DailyParticipantMetric) => parseFloat(new BN(b.totalParticipationScore).minus(a.totalParticipationScore).toString()));
  for (let i = 0; i < sortedMetrics.length; i++) {
    const metric = sortedMetrics[i];
    if (metric.user.id === userId) {
      rank = i+1;
      break;
    }
  }
  return rank;
}

export const extractVideoData = (video: string): any[] => {
  const mimeType = video.split(':')[1].split(';')[0];
  const image = video.split(',')[1];
  const bytes = Buffer.from(image, 'base64');
  return [mimeType, image, bytes.length];
}

export const chunkVideo = (video: string, chunkSize: number = 5000000): string[] => {
  const chunks = [];
  let currentChunk = "";
  for (let i = 0; i < video.length; i++) {
    currentChunk += video[i];
    if (currentChunk.length === chunkSize || i === video.length - 1) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
  }
  return chunks;
}

export const formatUTCDateForComparision = (date: Date): string => {
  const currentDate = new Date(date);
  const month = (currentDate.getUTCMonth() + 1) < 10 ? `0${currentDate.getUTCMonth() + 1}` : currentDate.getUTCMonth() + 1;
  const day = currentDate.getUTCDate() < 10 ? `0${currentDate.getUTCDate()}` : currentDate.getUTCDate();
  return `${currentDate.getUTCFullYear()}-${month}-${day}`;
}

export const getYesterdaysDate = (date: Date) => {
  const yesterdayDate = new Date(date);
  yesterdayDate.setUTCDate(new Date().getUTCDate() - 1);
  yesterdayDate.setUTCHours(0);
  yesterdayDate.setUTCMinutes(0);
  yesterdayDate.setUTCSeconds(0);
  yesterdayDate.setUTCMilliseconds(0);
  return yesterdayDate;
}
