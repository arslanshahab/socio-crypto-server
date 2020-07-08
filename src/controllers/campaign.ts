import {CampaignAuditReport} from "../types";
import {Campaign} from "../models/Campaign";
import {checkPermissions} from "../middleware/authentication";
import {Participant} from "../models/Participant";
import {S3Client} from '../clients/s3';
import {getConnection, In} from "typeorm";
import {User} from "../models/User";
import {Wallet} from "../models/Wallet";
import {SocialPost} from '../models/SocialPost';
import {getParticipant} from "./participant";
import {Firebase} from "../clients/firebase";
import {Dragonchain} from '../clients/dragonchain';
import {calculateParticipantPayout, calculateParticipantSocialScore, calculateTier} from "./helpers";
import { Transfer } from '../models/Transfer';
import { BN } from 'src/util/helpers';
import { BigNumber } from 'bignumber.js';


export const getCurrentCampaignTier = async (args: { campaignId?: string, campaign?: Campaign }) => {
    const { campaignId, campaign } = args;
    let currentTierSummary;
    if (campaignId) {
        const where: {[key: string]: string } = { 'id': campaignId };
        const currentCampaign = await Campaign.findOne({ where });
        if (!currentCampaign) throw new Error('campaign not found');
        currentTierSummary = calculateTier(currentCampaign.totalParticipationScore, currentCampaign.algorithm.tiers);
    } else if (campaign) {
        currentTierSummary = calculateTier(campaign.totalParticipationScore, campaign.algorithm.tiers);
    }
    if (!currentTierSummary) throw new Error('failure calculating current tier');
    return currentTierSummary;
}

export const createNewCampaign = async (args: { name: string, targetVideo: string, beginDate: string, endDate: string, coiinTotal: number, target: string, description: string, company: string, algorithm: string, image: string, tagline: string, suggestedPosts: string[], suggestedTags: string[] }, context: { user: any }) => {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const { name, beginDate, endDate, coiinTotal, target, description, algorithm, targetVideo, image, tagline, suggestedPosts, suggestedTags } = args;
    Campaign.validate.validateAlgorithmCreateSchema(JSON.parse(algorithm));
    if (role === 'admin' && !args.company) throw new Error('administrators need to specify a company in args');
    const campaignCompany = (role ==='admin') ? args.company : company;
    const campaign = Campaign.newCampaign(name, targetVideo, beginDate, endDate, coiinTotal, target, description, campaignCompany, algorithm, tagline, suggestedPosts, suggestedTags);
    await campaign.save();
    if (image) {
      campaign.imagePath = await S3Client.setCampaignImage('banner', campaign.id, image);
      await campaign.save();
    }
    return campaign.asV1();
}

export const updateCampaign = async (args: { id: string, name: string, beginDate: string, targetVideo: string, endDate: string, coiinTotal: number, target: string, description: string, algorithm: string, suggestedPosts: string[], suggestedTags: string[], image: string }, context: { user: any }) => {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const { id, name, beginDate, endDate, coiinTotal, target, description, algorithm, targetVideo, suggestedPosts, suggestedTags, image } = args;
    const where: {[key: string]: string} = { id };
    if (role === 'manager') where['company'] = company;
    const campaign = await Campaign.findOne({ where });
    if (!campaign) throw new Error('campaign not found');
    if (name) campaign.name = name;
    if (beginDate) campaign.beginDate = new Date(beginDate);
    if (endDate) campaign.endDate = new Date(endDate);
    if (coiinTotal) campaign.coiinTotal = new BN(coiinTotal);
    if (target) campaign.target = target;
    if (description) campaign.description = description;
    if (algorithm) {
        Campaign.validate.validateAlgorithmCreateSchema(JSON.parse(algorithm));
        campaign.algorithm = JSON.parse(algorithm);
    }
    if (targetVideo) campaign.targetVideo = targetVideo;
    if (suggestedPosts) campaign.suggestedPosts = suggestedPosts;
    if (suggestedTags) campaign.suggestedTags = suggestedTags;
    if (image) campaign.imagePath = await S3Client.setCampaignImage('banner', campaign.id, image);
    await campaign.save();
    return campaign.asV1();
}

export const listCampaigns = async (args: { open: boolean, skip: number, take: number, scoped: boolean }, context: { user: any }) => {
    const { open, skip = 0, take = 10, scoped = false } = args;
    const { company } = context.user;
    const [results, total] = await Campaign.findCampaignsByStatus(open, skip, take, scoped && company);
    return { results: results.map(result => result.asV1()), total };
}

export const deleteCampaign = async (args: { id: string }, context: { user: any }) => {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const where: {[key: string]: string} = { id: args.id };
    if (role === 'manager') where['company'] = company;
    const campaign = await Campaign.findOne({ where, relations: ['participants', 'posts'] });
    if (!campaign) throw new Error('campaign not found');
    if (campaign.posts.length > 0) await SocialPost.delete({ id: In(campaign.posts.map((p: any) => p.id)) });
    await Participant.remove(campaign.participants);
    await campaign.remove();
    return campaign.asV1();
}

export const get = async (args: { id: string }) => {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const campaign = await Campaign.findOne({ where, relations: ['participants'] });
    if (!campaign) throw new Error('campaign not found');
    campaign.participants.sort((a,b) => {return Number(b.participationScore) - Number(a.participationScore)});
    return campaign.asV1();
}

export const publicGet = async (args: { campaignId: string }) => {
    const { campaignId } = args;
    const campaign = await Campaign.findOne({ where: { id: campaignId } });
    if (!campaign) throw new Error('campaign not found');
    return campaign.asV1();
}

export const generateCampaignAuditReport = async (args: { campaignId: string }, context: { user: any }) => {
    const {company} = checkPermissions({hasRole: ['admin', 'manager']}, context);
    const {campaignId} = args;
    const campaign = await Campaign.findCampaignById(campaignId, company);
    if (!campaign) throw new Error('Campaign not found');
    const {currentTotal} = await getCurrentCampaignTier({campaign});
    const auditReport: CampaignAuditReport = {
        totalClicks: new BN(0),
        totalViews: new BN(0),
        totalSubmissions: new BN(0),
        totalLikes: new BN(0),
        totalShares: new BN(0),
        totalParticipationScore: campaign.totalParticipationScore,
        totalRewardPayout: currentTotal,
        flaggedParticipants: []
    };
    for (const participant of campaign.participants) {
        const {totalLikes, totalShares} = await calculateParticipantSocialScore(participant, campaign);
        auditReport.totalShares = auditReport.totalShares.plus(totalShares);
        auditReport.totalLikes = auditReport.totalLikes.plus(totalLikes);
        auditReport.totalClicks = auditReport.totalClicks.plus(participant.clickCount);
        auditReport.totalViews =  auditReport.totalViews.plus(participant.viewCount);
        auditReport.totalSubmissions = auditReport.totalSubmissions.plus(participant.submissionCount);
        const totalParticipantPayout = await calculateParticipantPayout(currentTotal, campaign, participant);
        if (totalParticipantPayout.gt(auditReport.totalRewardPayout.times(new BN(0.15)))) {
            auditReport.flaggedParticipants.push({
                participantId: participant.id,
                viewPayout: participant.viewCount.times(campaign.algorithm.pointValues.view),
                clickPayout: participant.clickCount.times(campaign.algorithm.pointValues.click),
                submissionPayout: participant.submissionCount.times(campaign.algorithm.pointValues.submission),
                likesPayout: totalLikes.times(campaign.algorithm.pointValues.likes),
                sharesPayout: totalShares.times(campaign.algorithm.pointValues.shares),
                totalPayout: totalParticipantPayout
            })
        }
    }
    return auditReport;
};

export const payoutCampaignRewards = async (args: { campaignId: string, rejected: string[] }, context: { user: any }) => {
    const {company} = checkPermissions({hasRole: ['admin', 'manager']}, context);
    const usersWalletValues: { [key: string]: BigNumber } = {};
    const userDeviceIds: { [key: string]: string } = {};
    const transfers: Transfer[] = [];
    return getConnection().transaction(async transactionalEntityManager => {
        const {campaignId, rejected} = args;
        const campaign = await Campaign.findOneOrFail({where: {id: campaignId, company}});
        const {currentTotal} = await getCurrentCampaignTier({campaign});
        const participants = await Participant.find({where: {campaign}, relations: ['user']});
        const users = (participants.length > 0) ? await User.find({
            where: {id: In(participants.map(p => p.user.id))},
            relations: ['wallet']
        }) : [];
        const wallets = (users.length > 0) ? await Wallet.find({
            where: {id: In(users.map(u => u.wallet.id))},
            relations: ['user']
        }) : [];
        if (rejected.length > 0) {
            const newParticipationCount = participants.length - rejected.length;
            let totalRejectedPayout = new BN(0);
            for (const id of rejected) {
                const participant = await getParticipant({id});
                const totalParticipantPayout = await calculateParticipantPayout(currentTotal, campaign, participant);
                totalRejectedPayout = totalRejectedPayout.plus(totalParticipantPayout);
            }
            const addedPayoutToEachParticipant = totalRejectedPayout.div(new BN(newParticipationCount));
            for (const participant of participants) {
                if (!rejected.includes(participant.id)) {
                    const subtotal = await calculateParticipantPayout(currentTotal, campaign, participant);
                    const totalParticipantPayout = subtotal.plus(addedPayoutToEachParticipant);
                    if (participant.user.deviceToken) userDeviceIds[participant.user.id] = participant.user.deviceToken;
                    if (!usersWalletValues[participant.user.id]) usersWalletValues[participant.user.id] = totalParticipantPayout;
                    else usersWalletValues[participant.user.id] = usersWalletValues[participant.user.id].plus(totalParticipantPayout);
                }
            }
        } else {
            for (const participant of participants) {
                const totalParticipantPayout = await calculateParticipantPayout(currentTotal, campaign, participant);
                if (participant.user.deviceToken) userDeviceIds[participant.user.id] = participant.user.deviceToken;
                if (!usersWalletValues[participant.user.id]) usersWalletValues[participant.user.id] = totalParticipantPayout;
                else usersWalletValues[participant.user.id] = usersWalletValues[participant.user.id].plus(totalParticipantPayout);
            }
        }
        for (const userId in usersWalletValues) {
            const currentWallet = wallets.find(w => w.user.id === userId);
            if (currentWallet) {
              currentWallet.balance = currentWallet.balance.plus(usersWalletValues[userId]);
              const transfer = Transfer.newFromCampaignPayout(currentWallet, campaign, usersWalletValues[userId]);
              transfers.push(transfer);
            }
        }
        campaign.audited = true;
        await transactionalEntityManager.save(campaign);
        await transactionalEntityManager.save(participants);
        await transactionalEntityManager.save(wallets);
        await transactionalEntityManager.save(transfers);
        await Firebase.sendCampaignCompleteNotifications(Object.values(userDeviceIds), campaign.name);
        await Dragonchain.ledgerCampaignAudit(usersWalletValues, rejected, campaign.id);
        return true;
    });
};


