import {CampaignAuditReport, CampaignStatus, DateTrunc} from "../types";
import {Campaign} from "../models/Campaign";
import {checkPermissions} from "../middleware/authentication";
import {Participant} from "../models/Participant";
import {S3Client} from '../clients/s3';
import {EntityManager, getConnection, In} from "typeorm";
import {User} from "../models/User";
import {Wallet} from "../models/Wallet";
import {SocialPost} from '../models/SocialPost';
import {getParticipant} from "./participant";
import {Firebase} from "../clients/firebase";
import {Dragonchain} from '../clients/dragonchain';
import {calculateParticipantPayout, calculateParticipantSocialScore, calculateRaffleWinner, calculateTier} from "./helpers";
import { Transfer } from '../models/Transfer';
import { BN } from '../util/helpers';
import { BigNumber } from 'bignumber.js';
import { Validator } from '../schemas';
import { CampaignRequirementSpecs, RafflePrizeStructure } from '../types';
import {Org} from "../models/Org";
import {HourlyCampaignMetric} from "../models/HourlyCampaignMetric";
import { DailyParticipantMetric } from '../models/DailyParticipantMetric';
import { RafflePrize } from '../models/RafflePrize';
import { SesClient } from '../clients/ses';
import { decrypt } from '../util/crypto';
import {Escrow} from "../models/Escrow";

const validator = new Validator();

export const getCurrentCampaignTier = async (args: { campaignId?: string, campaign?: Campaign }) => {
    const { campaignId, campaign } = args;
    let currentTierSummary;
    if (campaignId) {
        const where: {[key: string]: string } = { 'id': campaignId };
        const currentCampaign = await Campaign.findOne({ where });
        if (!currentCampaign) throw new Error('campaign not found');
        if (currentCampaign.type !== 'coiin') return { currentTier: -1, currentTotal: 0 };
        currentTierSummary = calculateTier(currentCampaign.totalParticipationScore, currentCampaign.algorithm.tiers);
    } else if (campaign) {
        if (campaign.type !== 'coiin') return { currentTier: -1, currentTotal: 0 };
        currentTierSummary = calculateTier(campaign.totalParticipationScore, campaign.algorithm.tiers);
    }
    if (!currentTierSummary) throw new Error('failure calculating current tier');
    return { currentTier: currentTierSummary.currentTier, currentTotal: parseFloat(currentTierSummary.currentTotal.toString()) };
}

export const createNewCampaign = async (args: { name: string, targetVideo: string, beginDate: string, endDate: string, coiinTotal: number, target: string, description: string, company: string, algorithm: string, image: string, tagline: string, requirements:CampaignRequirementSpecs, suggestedPosts: string[], suggestedTags: string[], type: string, rafflePrize: RafflePrizeStructure }, context: { user: any }) => {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const { name, beginDate, endDate, coiinTotal, target, description, algorithm, targetVideo, image, tagline, requirements, suggestedPosts, suggestedTags, type = 'coiin', rafflePrize } = args;
    validator.validateAlgorithmCreateSchema(JSON.parse(algorithm));
    if (!!requirements) validator.validateCampaignRequirementsSchema(requirements);
    if (type === 'raffle') {
      if (!rafflePrize) throw new Error('must specify prize for raffle');
      validator.validateRafflePrizeSchema(rafflePrize);
    }
    if (role === 'admin' && !args.company) throw new Error('administrators need to specify a company in args');
    const campaignCompany = (role ==='admin') ? args.company : company;
    const org = await Org.findOne({where: {name: company}, relations: ['fundingWallet']});
    if (!org) throw new Error('org not found');
    const campaign = Campaign.newCampaign(name, targetVideo, beginDate, endDate, coiinTotal, target, description, campaignCompany, algorithm, tagline, requirements, suggestedPosts, suggestedTags, type, org);
    await campaign.save();
    if (image) {
        campaign.imagePath = await S3Client.setCampaignImage('banner', campaign.id, image);
        await campaign.save();
    }
    if (type === 'raffle') {
      const prize = RafflePrize.newFromCampaignCreate(campaign, rafflePrize);
      await prize.save();
      if (rafflePrize.image && rafflePrize.image !== '') await S3Client.setCampaignRafflePrizeImage(campaign.id, prize.id, rafflePrize.image);
    }
    const deviceTokens = await User.getAllDeviceTokens('campaignCreate');
    if (deviceTokens.length > 0) await Firebase.sendCampaignCreatedNotifications(deviceTokens, campaign);
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
        validator.validateAlgorithmCreateSchema(JSON.parse(algorithm));
        campaign.algorithm = JSON.parse(algorithm);
    }
    if (targetVideo) campaign.targetVideo = targetVideo;
    if (suggestedPosts) campaign.suggestedPosts = suggestedPosts;
    if (suggestedTags) campaign.suggestedTags = suggestedTags;
    if (image) campaign.imagePath = await S3Client.setCampaignImage('banner', campaign.id, image);
    await campaign.save();
    return campaign.asV1();
}

export const adminUpdateCampaignStatus = async (args: {status: CampaignStatus, campaignId:string}, context: {user:any}) => {
  checkPermissions({ restrictCompany: 'raiinmaker' }, context);
  const { status, campaignId } = args;
  const campaign = await Campaign.findOne({where: {id: campaignId}, relations: ['org', 'org.fundingWallet']});
  if (!campaign) throw new Error('campaign not found');
  switch (status) {
    case "APPROVED":
      const wallet = campaign.org.fundingWallet;
      if (wallet.balance.lt(campaign.coiinTotal)) {
        campaign.status = 'INSUFFICIENT_FUNDS';
      } else {
        campaign.status = 'APPROVED';
        const escrow = Escrow.newCampaignEscrow(campaign, wallet);
        wallet.balance = wallet.balance.minus(campaign.coiinTotal);
        await wallet.save();
        await escrow.save();
      }
      break;
    case "DENIED":
      campaign.status = 'DENIED';
      break;
  }
  await campaign.save();
  return true;
}

export const listCampaigns = async (args: { open: boolean, skip: number, take: number, scoped: boolean, sort: boolean }, context: { user: any }) => {
    const { open, skip = 0, take = 10, scoped = false, sort = false } = args;
    const { company } = context.user;
    const [results, total] = await Campaign.findCampaignsByStatus(open, skip, take, scoped && company, sort);
    return { results: results.map(result => result.asV1()), total };
}

export const adminListPendingCampaigns = async (args: {skip: number, take: number}, context: {user: any}) => {
    checkPermissions({restrictCompany:'raiinmaker'}, context);
    const {skip = 0, take = 10} = args;
    const [results, total] = await Campaign.adminListCampaignsByStatus(skip, take);
    return { results: results.map(result => result.asV1()), total};
}

export const deleteCampaign = async (args: { id: string }, context: { user: any }) => {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const where: {[key: string]: string} = { id: args.id };
    if (role === 'manager') where['company'] = company;
    const campaign = await Campaign.findOne({ where, relations: ['participants', 'posts', 'dailyMetrics', 'hourlyMetrics', 'prize', 'payouts'] });
    if (!campaign) throw new Error('campaign not found');
    if (campaign.posts.length > 0) await SocialPost.delete({ id: In(campaign.posts.map((p: any) => p.id)) });
    if (campaign.prize) await RafflePrize.remove(campaign.prize);
    if (campaign.payouts) await Transfer.remove(campaign.payouts);
    await Participant.remove(campaign.participants);
    await DailyParticipantMetric.remove(campaign.dailyMetrics);
    await HourlyCampaignMetric.remove(campaign.hourlyMetrics);
    await campaign.remove();
    return campaign.asV1();
}

export const get = async (args: { id: string }) => {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const campaign = await Campaign.findOne({ where, relations: ['participants', 'prize'] });
    if (!campaign) throw new Error('campaign not found');
    campaign.participants.sort((a,b) => {return parseFloat((b.participationScore.minus(a.participationScore).toString()))});
    return campaign.asV1();
}

export const publicGet = async (args: { campaignId: string }) => {
    const { campaignId } = args;
    const campaign = await Campaign.findOne({ where: { id: campaignId } });
    if (!campaign) throw new Error('campaign not found');
    return campaign.asV1();
}

export const adminGetCampaignMetrics = async (args: { campaignId: string }, context: { user: any }) => {
  checkPermissions({ hasRole: ['admin'] }, context);
  const { campaignId } = args;
  const campaign = await Campaign.findOne({ where: { id: campaignId } });
  if (!campaign) throw new Error('campaign not found');
  return await Campaign.getCampaignMetrics(campaignId);
}

export const adminGetPlatformMetrics = async (args: any, context: { user: any }) => {
    checkPermissions({ hasRole: ['admin'] }, context);
    const metrics = await Campaign.getPlatformMetrics();
    return metrics;
}
export const adminGetHourlyCampaignMetrics = async (args: {campaignId: string, filter: DateTrunc, startDate: string, endDate: string}, context: {user: any}) => {
    const {company} = checkPermissions({ hasRole: ['admin']}, context);
    HourlyCampaignMetric.validate.validateHourlyMetricsArgs(args);
    const { campaignId, filter, startDate, endDate } = args;
    const org = await Org.findOne({where: {name: company}});
    if (!org) throw new Error('org not found');
    const campaign = await Campaign.findOne({ where: { id: campaignId, org }, relations: ['org'] });
    if (!campaign) throw new Error('campaign not found');
    const { currentTotal } = calculateTier(campaign.totalParticipationScore, campaign.algorithm.tiers);
    const metrics = await HourlyCampaignMetric.getDateGroupedMetrics(filter, startDate, endDate, campaign.id);
    return HourlyCampaignMetric.parseHourlyCampaignMetrics(metrics, filter, currentTotal);
}

export const adminGetHourlyPlatformMetrics = async (args: {filter: DateTrunc, startDate: string, endDate: string }, context: {user: any}) => {
    checkPermissions({ hasRole: ['admin']}, context);
    HourlyCampaignMetric.validate.validateHourlyMetricsArgs(args);
    const { filter, startDate, endDate } = args;
    const metrics = await HourlyCampaignMetric.getDateGroupedMetrics(filter, startDate, endDate);
    return HourlyCampaignMetric.parseHourlyPlatformMetrics(metrics, filter);
}

export const generateCampaignAuditReport = async (args: { campaignId: string }, context: { user: any }) => {
    const {company} = checkPermissions({hasRole: ['admin', 'manager']}, context);
    const {campaignId} = args;
    const campaign = await Campaign.findCampaignById(campaignId, company);
    if (!campaign) throw new Error('Campaign not found');
    const {currentTotal} = await getCurrentCampaignTier({campaign});
    const bigNumTotal = new BN(campaign.type !== 'coiin' ? 0 : currentTotal);
    const auditReport: CampaignAuditReport = {
        totalClicks: new BN(0),
        totalViews: new BN(0),
        totalSubmissions: new BN(0),
        totalLikes: new BN(0),
        totalShares: new BN(0),
        totalParticipationScore: campaign.totalParticipationScore,
        totalRewardPayout: bigNumTotal,
        flaggedParticipants: []
    };
    for (const participant of campaign.participants) {
        const {totalLikes, totalShares} = await calculateParticipantSocialScore(participant, campaign);
        auditReport.totalShares = auditReport.totalShares.plus(totalShares);
        auditReport.totalLikes = auditReport.totalLikes.plus(totalLikes);
        auditReport.totalClicks = auditReport.totalClicks.plus(participant.clickCount);
        auditReport.totalViews =  auditReport.totalViews.plus(participant.viewCount);
        auditReport.totalSubmissions = auditReport.totalSubmissions.plus(participant.submissionCount);
        const totalParticipantPayout = await calculateParticipantPayout(bigNumTotal, campaign, participant);

        const condition = campaign.type === 'raffle' ?
          participant.participationScore.gt(auditReport.totalParticipationScore.times(new BN(0.15))) :
          totalParticipantPayout.gt(auditReport.totalRewardPayout.times(new BN(0.15)));

        if (condition) {
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
    const report: {[key:string]: any} = auditReport;
    for (const key in report) {
      if (key === 'flaggedParticipants') {
        for (const flagged of report[key]) {
          for (const value in flagged) {
            if(value !== 'participantId') flagged[value] = parseFloat(flagged[value].toString());
          }
        }
        continue;
      }
      report[key] = parseFloat(report[key].toString());
    }
    return auditReport;
};

export const payoutCampaignRewards = async (args: { campaignId: string, rejected: string[] }, context: { user: any }) => {
    const {company} = checkPermissions({hasRole: ['admin', 'manager']}, context);
    return getConnection().transaction(async transactionalEntityManager => {
        const {campaignId, rejected} = args;
        const campaign = await Campaign.findOneOrFail({where: {id: campaignId, company}, relations: ['participants', 'prize', 'org', 'org.fundingWallet']});
        let deviceIds;
        switch (campaign.type) {
          case 'coiin':
            deviceIds = await payoutCoiinCampaignRewards(transactionalEntityManager, campaign, rejected);
            break;
          case 'raffle':
            deviceIds = await payoutRaffleCampaignRewards(transactionalEntityManager, campaign, rejected);
            break;
          default:
            throw new Error('campaign type is invalid');
        }
        if (deviceIds) await Firebase.sendCampaignCompleteNotifications(Object.values(deviceIds), campaign.name);
        return true;
    });
};

const payoutRaffleCampaignRewards = async (entityManager: EntityManager, campaign: Campaign, rejected: string[]) => {
  if (!campaign.prize) throw new Error('no campaign prize');
  if (campaign.participants.length === 0) throw new Error('no participants on campaign for audit');
  let totalParticipationScore = new BN(0).plus(campaign.totalParticipationScore);
  const clonedParticipants = (rejected.length > 0) ? campaign.participants.reduce((accum: Participant[], current: Participant) => {
    if (rejected.indexOf(current.id) > -1) totalParticipationScore = totalParticipationScore.minus(current.participationScore);
    else accum.push(current);
    return accum;
  }, []) : campaign.participants;
  const winner = calculateRaffleWinner(totalParticipationScore, clonedParticipants);
  const wallet = await Wallet.findOneOrFail({ where: { user: winner.user } });
  const prize = await RafflePrize.findOneOrFail({ where: { id: campaign.prize.id } });
  const transfer = Transfer.newFromRaffleSelection(wallet, campaign, prize);
  campaign.audited = true;
  await entityManager.save([campaign, wallet, transfer]);
  await SesClient.sendRafflePrizeRedemptionEmail(winner.user.id, decrypt(winner.email), campaign);
  await Dragonchain.ledgerRaffleCampaignAudit({ [winner.user.id]: campaign.prize.displayName }, [], campaign.id);
  return {[winner.user.id]: winner.user.profile.deviceToken};
}

const payoutCoiinCampaignRewards = async (entityManager: EntityManager, campaign: Campaign, rejected: string[]) => {
  const usersWalletValues: { [key: string]: BigNumber } = {};
  const userDeviceIds: { [key: string]: string } = {};
  const transfers: Transfer[] = [];
  const {currentTotal} = await getCurrentCampaignTier({campaign});
  const bigNumTotal = new BN(currentTotal);
  const participants = await Participant.find({where: {campaign}, relations: ['user']});
  const fundingWallet = campaign.org.fundingWallet;
  let totalPayout = new BN(0);
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
          const totalParticipantPayout = await calculateParticipantPayout(bigNumTotal, campaign, participant);
          totalRejectedPayout = totalRejectedPayout.plus(totalParticipantPayout);
      }
      const addedPayoutToEachParticipant = totalRejectedPayout.div(new BN(newParticipationCount));
      for (const participant of participants) {
          if (!rejected.includes(participant.id)) {
              const subtotal = await calculateParticipantPayout(bigNumTotal, campaign, participant);
              const totalParticipantPayout = subtotal.plus(addedPayoutToEachParticipant);
              if (participant.user.profile.deviceToken) userDeviceIds[participant.user.id] = participant.user.profile.deviceToken;
              if (!usersWalletValues[participant.user.id]) usersWalletValues[participant.user.id] = totalParticipantPayout;
              else usersWalletValues[participant.user.id] = usersWalletValues[participant.user.id].plus(totalParticipantPayout);
          }
      }
  } else {
      for (const participant of participants) {
          const totalParticipantPayout = await calculateParticipantPayout(bigNumTotal, campaign, participant);
          if (participant.user.profile.deviceToken) userDeviceIds[participant.user.id] = participant.user.profile.deviceToken;
          if (!usersWalletValues[participant.user.id]) usersWalletValues[participant.user.id] = totalParticipantPayout;
          else usersWalletValues[participant.user.id] = usersWalletValues[participant.user.id].plus(totalParticipantPayout);
      }
  }
  for (const userId in usersWalletValues) {
      const currentWallet = wallets.find(w => w.user.id === userId);
      if (currentWallet) {
        totalPayout = totalPayout.plus(usersWalletValues[userId]);
        currentWallet.balance = currentWallet.balance.plus(usersWalletValues[userId]);
        const transfer = Transfer.newFromCampaignPayout(currentWallet, campaign, usersWalletValues[userId]);
        transfers.push(transfer);
      }
    }
  fundingWallet.balance = fundingWallet.balance.minus(totalPayout);
  const payoutTransfer = Transfer.newFromFundingWalletPayout(campaign.org.fundingWallet, campaign, totalPayout);
  transfers.push(payoutTransfer);
  campaign.audited = true;
  await entityManager.save(campaign);
  await entityManager.save(participants);
  await entityManager.save(wallets);
  await entityManager.save(fundingWallet);
  await entityManager.save(transfers);

  await Dragonchain.ledgerCoiinCampaignAudit(usersWalletValues, rejected, campaign.id);
  return userDeviceIds;
}
