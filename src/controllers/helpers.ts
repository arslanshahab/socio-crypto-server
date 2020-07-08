import {SocialPost} from "../models/SocialPost";
import {Tiers} from "../types";
import {Participant} from "../models/Participant";
import {Campaign} from "../models/Campaign";
import { getConnection } from 'typeorm';
import { Wallet } from '../models/Wallet';
import { BN } from '../util/helpers';

export const calculateParticipantSocialScore = async (participant: Participant, campaign: Campaign) => {
    const socialPosts = await SocialPost.find({where: {participantId: participant.id}});
    let totalLikes = 0;
    let totalShares = 0;
    socialPosts.forEach(post => {
        totalLikes += post.likes;
        totalShares += post.shares;
    });
    return {
        totalLikes,
        totalShares,
        likesScore: totalLikes * campaign.algorithm.pointValues.likes,
        shareScore: totalShares * campaign.algorithm.pointValues.shares
    };
}

export const calculateTier = (totalParticipation: BigInt, tiers: Tiers) => {
    let currentTier = 1;
    let currentTotal = 1;
    const numOfTiers = Object.keys(tiers).reduce((accum: number, value: any) => {
        if ((tiers[value].threshold as any) !== "" && (tiers[value].totalCoiins as any) !== "") {
            accum++;
        }
        return accum;
    }, 0);
    if (totalParticipation > BigInt(tiers[numOfTiers].threshold)) {
        currentTier = numOfTiers;
        currentTotal = tiers[numOfTiers].totalCoiins;
        return { currentTotal, currentTier };
    }
    for(let key in tiers) {
        if (totalParticipation < BigInt(tiers[key].threshold) || !tiers[key].threshold) {
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

export const calculateParticipantPayout = async (currentCampaignTierTotal: number, campaign: Campaign, participant: Participant) => {
    if (Number(campaign.totalParticipationScore) === 0) return 0;
    const {totalLikes, totalShares} = await calculateParticipantSocialScore(participant, campaign);
    const viewValue = campaign.algorithm.pointValues.view;
    const clickValue = campaign.algorithm.pointValues.click;
    const submissionValue = campaign.algorithm.pointValues.submission;
    const likesValue = campaign.algorithm.pointValues.likes;
    const sharesValue = campaign.algorithm.pointValues.shares;
    const totalParticipantPoints = (participant.viewCount * viewValue) + (participant.clickCount * clickValue) + (participant.submissionCount * submissionValue) + (totalLikes * likesValue) + (totalShares * sharesValue);
    const percentageOfTotalParticipation = totalParticipantPoints / Number(campaign.totalParticipationScore);
    return currentCampaignTierTotal * percentageOfTotalParticipation;
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
