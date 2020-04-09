import {CampaignAuditReport} from "../types";
import {Participant} from "../models/Participant";
import {Campaign} from "../models/Campaign";
import {getConnection, In} from "typeorm";
import {checkPermissions} from "../middleware/authentication";
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';



export const generateCampaignAuditReport = async (args: { campaignId: string }, context: { user: any }) => {
  console.log(`ARGS: ${JSON.stringify(args)}`);
  console.log('before context');
  console.log(`CONTEXT: ${JSON.stringify(context.user)}`);
  console.log('after context');
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
        const totalParticipantPoints = (participant.viewCount * viewValue) + (participant.clickCount * clickValue) + (participant.submissionCount * submissionValue);
        const percentageOfTotalParticipation = totalParticipantPoints / auditReport.totalRewardPayout;
        const totalParticipantPayout = currentTotal * percentageOfTotalParticipation;
        if (BigInt(totalParticipantPayout) > (auditReport.totalRewardPayout * 0.15)) {
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
        const {campaignId, rejected } = args;
        const campaign = await Campaign.findOneOrFail({ where: {id: campaignId, company} });
        const participants = await Participant.find({ where: { campaign }, relations: ['user'] });
        const users = (participants.length > 0) ? await User.find({ where: { id: In(participants.map(p => p.user.id)) }, relations: ['wallet'] }) : [];
        const wallets = (users.length > 0) ? await Wallet.find({ where: { id: In(users.map(u => u.wallet.id)) }, relations: ['user'] }) : [];
        const clickValue = campaign.algorithm.pointValues.click;
        const viewValue = campaign.algorithm.pointValues.view;
        const submissionValue = campaign.algorithm.pointValues.submission;
        if (rejected.length > 0) {
            const newParticipationCount = participants.length - rejected.length;
            let totalRejectedPayout = 0;
            for (const id of rejected) {
                const participant = await Participant.get({id});
                totalRejectedPayout += (participant.submissionCount * submissionValue) + (participant.clickCount * clickValue) + (participant.viewCount * viewValue);
            }
            const addedPayoutToEachParticipant = totalRejectedPayout / newParticipationCount;
            for (const participant of participants) {
                if (!rejected.includes(participant.id)) {
                    const totalParticipantPayout = (participant.viewCount * viewValue) + (participant.clickCount * clickValue) + (participant.submissionCount * submissionValue) + addedPayoutToEachParticipant;
                    if (!usersWalletValues[participant.user.id]) usersWalletValues[participant.user.id] = totalParticipantPayout;
                    else usersWalletValues[participant.user.id] += totalParticipantPayout;
                }
            }
        } else {
            for (const participant of participants) {
                const totalParticipantPayout = (participant.viewCount * viewValue) + (participant.clickCount * clickValue) + (participant.submissionCount * submissionValue);
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
