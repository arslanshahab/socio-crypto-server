import {CampaignAuditReport} from "../types";
import {Participant} from "../models/Participant";
import {Campaign} from "../models/Campaign";
import {getConnection, In} from "typeorm";
import {checkPermissions} from "../middleware/authentication";
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';


export const calculateParticipantPayout = (totalCampaignParticipationScore: number, currentCampaignTierTotal: number, actionValues: {click: number, view: number, submission: number}, participant: Participant) => {
    const totalParticipantPoints = (participant.viewCount * actionValues.view) + (participant.clickCount * actionValues.click) + (participant.submissionCount * actionValues.submission);
    const percentageOfTotalParticipation = totalParticipantPoints / totalCampaignParticipationScore;
    return currentCampaignTierTotal * percentageOfTotalParticipation;
}

export const generateCampaignAuditReport = async (args: { campaignId: string }, context: { user: any }) => {
    const { company } = checkPermissions({hasRole: ['admin', 'manager']}, context);
    const { campaignId } = args;
    const campaign = await Campaign.findCampaignById({ id: campaignId, company });
    const clickValue = campaign.algorithm.pointValues.click;
    const viewValue = campaign.algorithm.pointValues.view;
    const submissionValue = campaign.algorithm.pointValues.submission;
    const { currentTotal } = await Campaign.getCurrentCampaignTier({campaign});
    const auditReport: CampaignAuditReport = {
        totalClicks: 0,
        totalViews: 0,
        totalSubmissions: 0,
        totalParticipationScore: Number(campaign.totalParticipationScore),
        totalRewardPayout: currentTotal,
        flaggedParticipants: []
    };
    campaign.participants.forEach(participant => {
        auditReport.totalClicks += participant.clickCount;
        auditReport.totalViews += participant.viewCount;
        auditReport.totalSubmissions += participant.submissionCount;
        const totalParticipantPayout = calculateParticipantPayout(Number(campaign.totalParticipationScore), currentTotal, campaign.algorithm.pointValues, participant);
        if (totalParticipantPayout > (auditReport.totalRewardPayout * 0.15)) {
            auditReport.flaggedParticipants.push({
                participantId: participant.id,
                viewPayout: participant.viewCount * viewValue,
                clickPayout: participant.clickCount * clickValue,
                submissionPayout: participant.submissionCount * submissionValue,
                totalPayout: totalParticipantPayout
            })
        }
    });
    return auditReport;
};



export const payoutCampaignRewards = async (args: { campaignId: string, rejected: string[] }, context: { user: any }) => {
    const { company } = checkPermissions({hasRole: ['admin', 'manager']}, context);
    console.log(`Beginning payout for company: ${company}`);
    const usersWalletValues: {[key: string]: number} = {};
    return getConnection().transaction(async transactionalEntityManager => {
        console.log('------>>> 1')
        const {campaignId, rejected } = args;
        console.log('------>>> 2')
        const campaign = await Campaign.findOneOrFail({ where: {id: campaignId, company} });
        console.log('------>>> 3')
        const { currentTotal } = await Campaign.getCurrentCampaignTier({campaign});
        console.log('------>>> 4')
        const participants = await Participant.find({ where: { campaign }, relations: ['user'] });
        console.log('------>>> 5')
        const users = (participants.length > 0) ? await User.find({ where: { id: In(participants.map(p => p.user.id)) }, relations: ['wallet'] }) : [];
        console.log('------>>> 6')
        const wallets = (users.length > 0) ? await Wallet.find({ where: { id: In(users.map(u => u.wallet.id)) }, relations: ['user'] }) : [];
        console.log('------>>> 7', currentTotal)
        if (rejected.length > 0) {
        console.log('------>>> 8')
            const newParticipationCount = participants.length - rejected.length;
        console.log('------>>> 9')
            let totalRejectedPayout = 0;
        console.log('------>>> 10')
            for (const id of rejected) {
        console.log('------>>> 11')
                const participant = await Participant.get({id});
        console.log('------>>> 12')
                const totalParticipantPayout = calculateParticipantPayout(Number(campaign.totalParticipationScore), currentTotal, campaign.algorithm.pointValues, participant);
        console.log('------>>> 13')
                totalRejectedPayout += totalParticipantPayout;
        console.log('------>>> 14')
            }
        console.log('------>>> 15')
            const addedPayoutToEachParticipant = totalRejectedPayout / newParticipationCount;
        console.log('------>>> 16')
            for (const participant of participants) {
        console.log('------>>> 17')
                if (!rejected.includes(participant.id)) {
        console.log('------>>> 18')
                    const subtotal = calculateParticipantPayout(Number(campaign.totalParticipationScore), currentTotal, campaign.algorithm.pointValues, participant);
        console.log('------>>> 19')
                    const totalParticipantPayout = subtotal + addedPayoutToEachParticipant;
        console.log('------>>> 20')
                    if (!usersWalletValues[participant.user.id]) usersWalletValues[participant.user.id] = totalParticipantPayout;
                    else usersWalletValues[participant.user.id] += totalParticipantPayout;
                }
            }
        } else {
            for (const participant of participants) {
                console.log('participant details -->> ', participant);
                const totalParticipantPayout = calculateParticipantPayout(Number(campaign.totalParticipationScore), currentTotal, campaign.algorithm.pointValues, participant);
                console.log('total participation -->> ', totalParticipantPayout);
                if (!usersWalletValues[participant.user.id]) usersWalletValues[participant.user.id] = totalParticipantPayout;
                else usersWalletValues[participant.user.id] += totalParticipantPayout;
            }
        }
        for (const userId in usersWalletValues) {
          const currentWallet = wallets.find(w => w.user.id === userId);
          if (currentWallet) currentWallet.balance += usersWalletValues[userId];
        }
        campaign.audited = true;
        await transactionalEntityManager.save(campaign);
        await transactionalEntityManager.save(participants);
        await transactionalEntityManager.save(wallets);
        return true;
    });
};
