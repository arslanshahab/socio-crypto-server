import {CampaignAuditReport} from "../types";
import {Participant} from "../models/Participant";
import {Campaign} from "../models/Campaign";
import {getConnection} from "typeorm";

export const generateCampaignAuditReport = async (args: { id: string }, context: { user: any }) => {
    const campaign = await Campaign.get({ where: { id, company: context.user.company }});
    const clickValue = campaign.algorithm.pointValues.click;
    const viewValue = campaign.algorithm.pointValues.view;
    const submissionValue = campaign.algorithm.pointValues.submission;
    const auditReport: CampaignAuditReport = {
        totalClicks: 0,
        totalViews: 0,
        totalSubmissions: 0,
        totalRewardPayout: BigInt(campaign.totalParticipationScore),
        flaggedParticipants: []
    };
    campaign.participants.forEach(participant => {
        auditReport.totalClicks += participant.clickCount;
        auditReport.totalViews += participant.viewCount;
        auditReport.totalSubmissions += participant.submissionCount;
        const totalParticipantPayout = (participant.viewCount * viewValue) + (participant.clickCount * clickValue) + (participant.submissionCount * submissionValue);
        if (BigInt(totalParticipantPayout) > (BigInt(campaign.totalParticipationScore) * BigInt('0.15'))) {
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

export const payoutCampaignRewards = async (id: string, rejected: string[]) => {
    return getConnection().transaction(async transactionalEntityManager => {
        const campaign = await Campaign.findCampaignById({id});
        const clickValue = campaign.algorithm.pointValues.click;
        const viewValue = campaign.algorithm.pointValues.view;
        const submissionValue = campaign.algorithm.pointValues.submission;
        if (rejected.length > 0) {
            const newParticipationCount = campaign.participants.length - rejected.length;
            let totalRejectedPayout = 0;
            for (const id of rejected) {
                const participant = await Participant.get({id});
                totalRejectedPayout += (participant.submissionCount * submissionValue) + (participant.clickCount * clickValue) + (participant.viewCount * viewValue);
            }
            const addedPayoutToEachParticipant = totalRejectedPayout / newParticipationCount;
            for (const participant of campaign.participants) {
                if (!rejected.includes(participant.id)) {
                    const totalParticipantPayout = (participant.viewCount * viewValue) + (participant.clickCount * clickValue) + (participant.submissionCount * submissionValue) + addedPayoutToEachParticipant;
                    participant.user.wallet.balance += totalParticipantPayout;
                }
            }
        } else {
            for (const participant of campaign.participants) {
                const totalParticipantPayout = (participant.viewCount * viewValue) + (participant.clickCount * clickValue) + (participant.submissionCount * submissionValue);
                participant.user.wallet.balance += totalParticipantPayout;
            }
        }
        await transactionalEntityManager.save(campaign);
    })
};
