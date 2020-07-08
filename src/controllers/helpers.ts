import {SocialPost} from "../models/SocialPost";
import {CampaignAuditReport, Tiers} from "../types";
import {Participant} from "../models/Participant";
import {Campaign} from "../models/Campaign";
import { getConnection } from 'typeorm';
import { Wallet } from '../models/Wallet';
import { BN } from '../util/helpers';
import { BigNumber } from 'bignumber.js';

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
    const {totalLikes, totalShares} = await calculateParticipantSocialScore(participant, campaign);
    const viewScore = campaign.algorithm.pointValues.view.times(participant.viewCount);
    const clickScore = campaign.algorithm.pointValues.click.times(participant.clickCount);
    const submissionScore = campaign.algorithm.pointValues.submission.times(participant.submissionCount);
    const likesScore = campaign.algorithm.pointValues.likes.times(totalLikes);
    const sharesScore = campaign.algorithm.pointValues.shares.times(totalShares);
    const totalParticipantPoints = viewScore.plus(clickScore).plus(submissionScore).plus(likesScore).plus(sharesScore);
    const percentageOfTotalParticipation = totalParticipantPoints.div(campaign.totalParticipationScore);
    return currentCampaignTierTotal.multipliedBy(percentageOfTotalParticipation);
}

export const performTransfer = async (walletId: string, amount: string, action: 'credit' | 'debit') => {
  if (BigInt(amount) <= BigInt(0)) throw new Error("Amount must be a positive number");
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

export const parseAuditReport = (reportEntity: CampaignAuditReport) => {
    const report: {[key:string]: any} = reportEntity;
    for (const key in report) {
        report[key] = parseFloat(report[key].toString());
    }
}
