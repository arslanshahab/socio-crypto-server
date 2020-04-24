import {SocialPost} from "../models/SocialPost";
import {Tiers} from "../types";
import {Participant} from "../models/Participant";
import {Campaign} from "../models/Campaign";

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
    for(let key in tiers) {
        if (totalParticipation < BigInt(tiers[key].threshold)) {
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
