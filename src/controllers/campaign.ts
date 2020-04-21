import {Tiers} from "../types";
import {Campaign} from "../models/Campaign";
import {checkPermissions} from "../middleware/authentication";
import {Participant} from "../models/Participant";


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

export const createNewCampaign = async (args: { name: string, targetVideo: string, beginDate: string, endDate: string, coiinTotal: number, target: string, description: string, company: string, algorithm: string, image: string }, context: { user: any }) => {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const { name, beginDate, endDate, coiinTotal, target, description, algorithm, targetVideo, image } = args;
    Campaign.validate.validateAlgorithmCreateSchema(JSON.parse(algorithm));
    if (role === 'admin' && !args.company) throw new Error('administrators need to specify a company in args');
    const campaignCompany = (role ==='admin') ? args.company : company;
    const campaign = Campaign.newCampaign(name, targetVideo, beginDate, endDate, coiinTotal, target, description, campaignCompany, algorithm, image);

    return campaign.save();
}

export const updateCampaign = async (args: { id: string, name: string, beginDate: string, targetVideo: string, endDate: string, coiinTotal: number, target: string, description: string, algorithm: string }, context: { user: any }) => {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const { id, name, beginDate, endDate, coiinTotal, target, description, algorithm, targetVideo } = args;
    Campaign.validate.validateAlgorithmCreateSchema(JSON.parse(algorithm));
    const where: {[key: string]: string} = { id };
    if (role === 'manager') where['company'] = company;
    const campaign = await Campaign.findOne({ where });
    if (!campaign) throw new Error('campaign not found');
    if (name) campaign.name = name;
    if (beginDate) campaign.beginDate = new Date(beginDate);
    if (endDate) campaign.endDate = new Date(endDate);
    if (coiinTotal) campaign.coiinTotal = coiinTotal;
    if (target) campaign.target = target;
    if (description) campaign.description = description;
    if (algorithm) campaign.algorithm = JSON.parse(algorithm);
    if (targetVideo) campaign.targetVideo = targetVideo;
    await campaign.save();
    return campaign;
}

export const listCampaigns = async (args: { open: boolean, skip: number, take: number, scoped: boolean }, context: { user: any }) => {
    const { open, skip = 0, take = 10, scoped = false } = args;
    const { company } = context.user;
    const [results, total] = await Campaign.findCampaignsByStatus(open, skip, take, scoped && company);
    return { results, total };
}

export const deleteCampaign = async (args: { id: string }, context: { user: any }) => {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const where: {[key: string]: string} = { id: args.id };
    if (role === 'manager') where['company'] = company;
    const campaign = await Campaign.findOne({ where, relations: ['participants'] });
    if (!campaign) throw new Error('campaign not found');
    await Participant.remove(campaign.participants);
    await campaign.remove();
    return campaign;
}

export const get = async (args: { id: string }) => {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const campaign = await Campaign.findOne({ where, relations: ['participants'] });
    if (!campaign) throw new Error('campaign not found');
    return campaign;
}

export const publicGet = async (args: { campaignId: string }) => {
    const { campaignId } = args;
    const campaign = await Campaign.findOne({ where: { id: campaignId } });
    if (!campaign) throw new Error('campaign not found');
    return campaign;
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
