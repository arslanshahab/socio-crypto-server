import {CampaignAuditReport} from "../types";
import {Participant} from "../models/Participant";
import {Campaign} from "../models/Campaign";

export const generateCampaignAuditReport = async (id: string) => {
    const campaign = await Campaign.findOneOrFail({where: id, relations: ['participants']});
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
                viewPayout: participant.viewCount * viewValue,
                clickPayout: participant.clickCount * clickValue,
                submissionPayout: participant.submissionCount * submissionValue,
                totalPayout: totalParticipantPayout
            })
        }
    });
    return auditReport;
};

export const payoutCampaignRewards = async (id: string, rejected: String[]) => {
    const campaign = await Campaign.findOneOrFail({where: id, relations: ['participants']});
    const clickValue = campaign.algorithm.pointValues.click;
    const viewValue = campaign.algorithm.pointValues.view;
    const submissionValue = campaign.algorithm.pointValues.submission;
    if (rejected.length > 0) {
        const newParticipationCount = campaign.participants.length - rejected.length;
        let totalRejectedPayout = 0;
        for (const user of rejected) {
            const participant = await Participant.findOneOrFail({where: {id: user}});
            totalRejectedPayout += (participant.submissionCount * submissionValue) + (participant.clickCount * clickValue) + (participant.viewCount * viewValue);
        }
        const addedPayoutToEachParticipant = totalRejectedPayout / newParticipationCount;
    }
}
