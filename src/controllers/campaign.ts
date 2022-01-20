import { CampaignAuditReport, CampaignChannelMedia, CampaignStatus, DateTrunc } from "../types";
import { Campaign } from "../models/Campaign";
import { checkPermissions } from "../middleware/authentication";
import { Participant } from "../models/Participant";
import { S3Client } from "../clients/s3";
import { In, ILike } from "typeorm";
import { User } from "../models/User";
import { SocialPost } from "../models/SocialPost";
import { Firebase } from "../clients/firebase";
import { calculateParticipantPayout, calculateParticipantSocialScore, calculateTier } from "./helpers";
import { Transfer } from "../models/Transfer";
import { BN } from "../util/helpers";
import { Validator } from "../schemas";
import { CampaignRequirementSpecs, RafflePrizeStructure } from "../types";
import { Org } from "../models/Org";
import { HourlyCampaignMetric } from "../models/HourlyCampaignMetric";
import { DailyParticipantMetric } from "../models/DailyParticipantMetric";
import { RafflePrize } from "../models/RafflePrize";
import { Escrow } from "../models/Escrow";
import { getTokenPriceInUsd } from "../clients/ethereum";
import { CampaignChannelTemplate } from "../types.d";
import { CampaignMedia } from "../models/CampaignMedia";
import { CampaignTemplate } from "../models/CampaignTemplate";
import { isSupportedCurrency } from "../helpers";

const validator = new Validator();

export const getCurrentCampaignTier = async (parent: any, args: { campaignId?: string; campaign?: Campaign }) => {
    const { campaignId, campaign } = args;
    let currentTierSummary;
    let currentCampaign;
    let cryptoPriceUsd;
    if (campaignId) {
        const where: { [key: string]: string } = { id: campaignId };
        currentCampaign = await Campaign.findOne({ where });
        if (!currentCampaign) throw new Error("campaign not found");
        if (currentCampaign.type == "raffle") return { currentTier: -1, currentTotal: 0 };
        currentTierSummary = calculateTier(currentCampaign.totalParticipationScore, currentCampaign.algorithm.tiers);
        if (currentCampaign.crypto) cryptoPriceUsd = await getTokenPriceInUsd(currentCampaign.crypto.type);
    } else if (campaign) {
        if (campaign.type == "raffle") return { currentTier: -1, currentTotal: 0 };
        currentTierSummary = calculateTier(campaign.totalParticipationScore, campaign.algorithm.tiers);
        if (campaign.crypto) cryptoPriceUsd = await getTokenPriceInUsd(campaign.crypto.type);
    }
    if (!currentTierSummary) throw new Error("failure calculating current tier");
    let body: any = {
        currentTier: currentTierSummary.currentTier,
        currentTotal: parseFloat(currentTierSummary.currentTotal.toString()),
    };
    if (campaign) body.campaignType = campaign.type;
    if (currentCampaign) body.campaignType = currentCampaign.type;
    if (cryptoPriceUsd) body.tokenValueUsd = cryptoPriceUsd.toString();
    if (cryptoPriceUsd) body.tokenValueCoiin = cryptoPriceUsd.times(10).toString();
    return body;
};

export const createNewCampaign = async (
    parent: any,
    args: {
        name: string;
        targetVideo?: string;
        beginDate: string;
        endDate: string;
        coiinTotal: number;
        target: string;
        description: string;
        instructions: string;
        company: string;
        algorithm: string;
        imagePath: string;
        tagline: string;
        requirements: CampaignRequirementSpecs;
        suggestedPosts: string[];
        suggestedTags: string[];
        keywords: string[];
        type: string;
        rafflePrize: RafflePrizeStructure;
        symbol: string;
        campaignType: string;
        socialMediaType: string[];
        campaignMedia: CampaignChannelMedia[];
        campaignTemplates: CampaignChannelTemplate[];
    },
    context: { user: any }
) => {
    const { role, company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
    const {
        name,
        beginDate,
        endDate,
        coiinTotal,
        target,
        description,
        instructions,
        algorithm,
        targetVideo,
        imagePath,
        tagline,
        requirements,
        suggestedPosts,
        suggestedTags,
        keywords,
        type = "crypto",
        rafflePrize,
        symbol,
        campaignType,
        socialMediaType,
        campaignMedia,
        campaignTemplates,
    } = args;
    validator.validateAlgorithmCreateSchema(JSON.parse(algorithm));
    if (!!requirements) validator.validateCampaignRequirementsSchema(requirements);
    if (type === "raffle") {
        if (!rafflePrize) throw new Error("must specify prize for raffle");
        validator.validateRafflePrizeSchema(rafflePrize);
    }
    if (role === "admin" && !args.company) throw new Error("administrators need to specify a company in args");
    const campaignCompany = role === "admin" ? args.company : company;
    const org = await Org.findOne({
        where: { name: company },
        relations: ["wallet", "wallet.walletCurrency"],
    });
    if (!org) throw new Error("org not found");
    if (type === "crypto") {
        const isCurrencySupported = await isSupportedCurrency(symbol);
        if (!isCurrencySupported) throw new Error("this currency is not supported");
        const isWalletAvailable = await org.isCurrencyAdded(symbol);
        if (!isWalletAvailable) throw new Error("currency not found in wallet");
    }
    const findCampaignName = await Campaign.findOne({ name: ILike(name) });
    if (findCampaignName) {
        return new Error(
            "The campaign already exists with this name, please change your campaign name and submit it again."
        );
    }
    const campaign = Campaign.newCampaign(
        name,
        beginDate,
        endDate,
        coiinTotal,
        target,
        description,
        instructions,
        campaignCompany,
        symbol,
        algorithm,
        tagline,
        requirements,
        suggestedPosts,
        suggestedTags,
        keywords,
        type,
        imagePath,
        campaignType,
        socialMediaType,
        targetVideo,
        org
    );
    await campaign.save();
    await CampaignMedia.saveMultipleMedias(campaignMedia, campaign);
    await CampaignTemplate.saveMultipleTemplates(campaignTemplates, campaign);
    let campaignImageSignedURL = "";
    let raffleImageSignedURL = "";
    let mediaUrls: any = [];
    if (imagePath) {
        campaignImageSignedURL = await S3Client.generateCampaignSignedURL(`campaign/${campaign.id}/${imagePath}`);
    }
    if (type === "raffle") {
        const prize = RafflePrize.newFromCampaignCreate(campaign, rafflePrize);
        await prize.save();
        if (rafflePrize.image && rafflePrize.image !== "") {
            raffleImageSignedURL = await S3Client.generateCampaignSignedURL(`rafflePrize/${campaign.id}/${prize.id}`);
        }
    }
    if (campaignMedia.length) {
        campaignMedia.forEach(async (item) => {
            if (item.media && item.mediaFormat) {
                let urlObject = { name: "", channel: "", signedUrl: "" };
                urlObject.signedUrl = await S3Client.generateCampaignSignedURL(`campaign/${campaign.id}/${item.media}`);
                urlObject.name = item.media;
                urlObject.channel = item.channel;
                mediaUrls.push(urlObject);
            }
        });
    }
    const deviceTokens = await User.getAllDeviceTokens("campaignCreate");
    if (deviceTokens.length > 0) await Firebase.sendCampaignCreatedNotifications(deviceTokens, campaign);
    return {
        campaignId: campaign.id,
        campaignImageSignedURL: campaignImageSignedURL,
        raffleImageSignedURL: raffleImageSignedURL,
        mediaUrls: mediaUrls,
    };
};

export const updateCampaign = async (
    parent: any,
    args: {
        id: string;
        name: string;
        targetVideo?: string;
        beginDate: string;
        endDate: string;
        coiinTotal: number;
        target: string;
        description: string;
        instructions: string;
        company: string;
        algorithm: string;
        imagePath: string;
        tagline: string;
        requirements: CampaignRequirementSpecs;
        suggestedPosts: string[];
        suggestedTags: string[];
        keywords: string[];
        type: string;
        rafflePrize: RafflePrizeStructure;
        campaignType: string;
        socialMediaType: string[];
        campaignMedia: CampaignChannelMedia[];
        campaignTemplates: CampaignChannelTemplate[];
        symbol: string;
    },
    context: { user: any }
) => {
    const { role, company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
    const {
        id,
        name,
        beginDate,
        endDate,
        target,
        description,
        instructions,
        algorithm,
        targetVideo,
        imagePath,
        tagline,
        requirements,
        suggestedPosts,
        suggestedTags,
        keywords,
        type = "crypto",
        rafflePrize,
        campaignType,
        socialMediaType,
        campaignMedia,
        campaignTemplates,
        symbol,
    } = args;
    validator.validateAlgorithmCreateSchema(JSON.parse(algorithm));
    if (!!requirements) validator.validateCampaignRequirementsSchema(requirements);
    if (type === "raffle") {
        if (!rafflePrize) throw new Error("must specify prize for raffle");
        validator.validateRafflePrizeSchema(rafflePrize);
    }
    if (role === "admin" && !args.company) throw new Error("administrators need to specify a company in args");
    const org = await Org.findOne({
        where: { name: company },
        relations: ["wallet", "wallet.walletCurrency"],
    });
    if (!org) throw new Error("org not found");
    if (type === "crypto") {
        const isCurrencySupported = await isSupportedCurrency(symbol);
        if (!isCurrencySupported) throw new Error("this currency is not supported");
        const isWalletAvailable = await org.isCurrencyAdded(symbol);
        if (!isWalletAvailable) throw new Error("currency not found in wallet");
    }
    const campaign = await Campaign.findOne({ where: { id: id } });
    if (!campaign) throw new Error("campaign not found");
    let campaignImageSignedURL = "";
    let raffleImageSignedURL = "";
    let mediaUrls: any = [];
    if (name) campaign.name = name;
    if (target) campaign.target = target;
    if (beginDate) campaign.beginDate = new Date(beginDate);
    if (endDate) campaign.endDate = new Date(endDate);
    if (algorithm) campaign.algorithm = JSON.parse(algorithm);
    if (campaignType) campaign.campaignType = campaignType;
    if (socialMediaType) campaign.socialMediaType = socialMediaType;
    if (targetVideo) campaign.targetVideo = targetVideo;
    if (description) campaign.description = description;
    if (instructions) campaign.instructions = instructions;
    if (tagline) campaign.tagline = tagline;
    if (requirements) campaign.requirements = requirements;
    if (suggestedPosts) campaign.suggestedPosts = suggestedPosts;
    if (suggestedTags) campaign.suggestedTags = suggestedTags;
    if (keywords) campaign.keywords = keywords;
    if (imagePath && campaign.imagePath !== imagePath) {
        campaign.imagePath = imagePath;
        campaignImageSignedURL = await S3Client.generateCampaignSignedURL(`campaign/${campaign.id}/${imagePath}`);
    }
    if (campaignTemplates) {
        for (let index = 0; index < campaignTemplates.length; index++) {
            const receivedTemplate = campaignTemplates[index];
            if (receivedTemplate.id) {
                const foundTemplate = await CampaignTemplate.findOne({ where: { id: receivedTemplate.id } });
                if (foundTemplate) {
                    foundTemplate.post = receivedTemplate.post;
                    await foundTemplate.save();
                }
            } else {
                CampaignTemplate.saveTemplate(receivedTemplate, campaign);
            }
        }
    }
    if (campaignMedia) {
        for (let index = 0; index < campaignMedia.length; index++) {
            const receivedMedia = campaignMedia[index];
            if (receivedMedia.id) {
                const foundMedia = await CampaignMedia.findOne({ where: { id: receivedMedia.id } });
                if (foundMedia && foundMedia.media !== receivedMedia.media) {
                    foundMedia.media = receivedMedia.media;
                    foundMedia.mediaFormat = receivedMedia.mediaFormat;
                    let urlObject = { name: receivedMedia.media, channel: receivedMedia.channel, signedUrl: "" };
                    urlObject.signedUrl = await S3Client.generateCampaignSignedURL(
                        `campaign/${campaign.id}/${receivedMedia.media}`
                    );
                    mediaUrls.push(urlObject);
                    await foundMedia.save();
                }
            } else {
                let urlObject = { name: receivedMedia.media, channel: receivedMedia.channel, signedUrl: "" };
                urlObject.signedUrl = await S3Client.generateCampaignSignedURL(
                    `campaign/${campaign.id}/${receivedMedia.media}`
                );
                mediaUrls.push(urlObject);
                CampaignMedia.saveMedia(receivedMedia, campaign);
            }
        }
    }
    await campaign.save();
    return {
        campaignId: campaign.id,
        campaignImageSignedURL: campaignImageSignedURL,
        raffleImageSignedURL: raffleImageSignedURL,
        mediaUrls: mediaUrls,
    };
};

export const adminUpdateCampaignStatus = async (
    parent: any,
    args: { status: CampaignStatus; campaignId: string },
    context: { user: any }
) => {
    checkPermissions({ restrictCompany: "raiinmaker" }, context);
    const { status, campaignId } = args;
    const campaign = await Campaign.findOne({
        where: { id: campaignId },
        relations: ["org"],
    });
    if (!campaign) throw new Error("campaign not found");
    if (!campaign.org) throw new Error("No organization found for campaign");
    switch (status) {
        case "APPROVED":
            if (campaign.type === "raffle") {
                campaign.status = "APPROVED";
                break;
            }
            const walletBalance = await campaign.org.getAvailableBalance(campaign.symbol);
            if (walletBalance < campaign.coiinTotal.toNumber()) {
                campaign.status = "INSUFFICIENT_FUNDS";
                break;
            }
            campaign.status = "APPROVED";
            const blockageId = await campaign.blockCampaignAmount();
            if (campaign.symbol.toLowerCase() !== "coiin") {
                campaign.tatumBlockageId = blockageId;
            }
            break;
        case "DENIED":
            campaign.status = "DENIED";
            break;
    }
    await campaign.save();
    const deviceTokens = await User.getAllDeviceTokens("campaignCreate");
    if (deviceTokens.length > 0) await Firebase.sendCampaignCreatedNotifications(deviceTokens, campaign);
    return true;
};

export const listCampaigns = async (
    parent: any,
    args: {
        open: boolean;
        skip: number;
        take: number;
        scoped: boolean;
        sort: boolean;
        approved: boolean;
        pendingAudit: boolean;
    },
    context: { user: any }
) => {
    const { open, skip = 0, take = 10, scoped = false, sort = false, approved = true, pendingAudit = false } = args;
    const { company } = context.user;
    const [results, total] = await Campaign.findCampaignsByStatus(
        open,
        skip,
        take,
        scoped && company,
        sort,
        approved,
        pendingAudit
    );
    const data = results.map((result) => result.asV1());
    return { results: data, total };
};

export const adminListPendingCampaigns = async (
    parent: any,
    args: { skip: number; take: number },
    context: { user: any }
) => {
    checkPermissions({ restrictCompany: "raiinmaker" }, context);
    const { skip = 0, take = 10 } = args;
    const [results, total] = await Campaign.adminListCampaignsByStatus(skip, take);
    return { results: results.map((result) => result.asV1()), total };
};

export const deleteCampaign = async (parent: any, args: { id: string }, context: { user: any }) => {
    const { role, company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
    const where: { [key: string]: string } = { id: args.id };
    if (role === "manager") where["company"] = company;
    const campaign = await Campaign.findOne({
        where,
        relations: [
            "participants",
            "posts",
            "dailyMetrics",
            "hourlyMetrics",
            "prize",
            "payouts",
            "escrow",
            "campaignTemplates",
            "campaignMedia",
        ],
    });
    if (!campaign) throw new Error("campaign not found");
    if (campaign.posts.length > 0)
        await SocialPost.delete({
            id: In(campaign.posts.map((p: any) => p.id)),
        });
    if (campaign.prize) await RafflePrize.remove(campaign.prize);
    if (campaign.payouts) await Transfer.remove(campaign.payouts);
    if (campaign.escrow) await Escrow.remove(campaign.escrow);
    await Participant.remove(campaign.participants);
    await DailyParticipantMetric.remove(campaign.dailyMetrics);
    await HourlyCampaignMetric.remove(campaign.hourlyMetrics);
    await CampaignTemplate.remove(campaign.campaignTemplates);
    await CampaignMedia.remove(campaign.campaignMedia);
    await campaign.remove();
    return campaign.asV1();
};

export const get = async (parent: any, args: { id: string }) => {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const campaign = await Campaign.findOne({
        where,
        relations: ["participants", "prize", "campaignMedia", "campaignTemplates"],
    });
    if (!campaign) throw new Error("campaign not found");
    campaign.participants.sort((a, b) => {
        return parseFloat(b.participationScore.minus(a.participationScore).toString());
    });
    return campaign.asV1();
};

export const publicGet = async (parent: any, args: { campaignId: string }) => {
    const { campaignId } = args;
    const campaign = await Campaign.findOne({ where: { id: campaignId } });
    if (!campaign) throw new Error("campaign not found");
    return campaign.asV1();
};

export const adminGetCampaignMetrics = async (parent: any, args: { campaignId: string }, context: { user: any }) => {
    checkPermissions({ hasRole: ["admin"] }, context);
    const { campaignId } = args;
    const campaign = await Campaign.findOne({ where: { id: campaignId } });
    if (!campaign) throw new Error("campaign not found");
    return await Campaign.getCampaignMetrics(campaignId);
};

export const adminGetPlatformMetrics = async (parent: any, args: any, context: { user: any }) => {
    checkPermissions({ hasRole: ["admin"] }, context);
    const metrics = await Campaign.getPlatformMetrics();
    return metrics;
};
export const adminGetHourlyCampaignMetrics = async (
    parent: any,
    args: {
        campaignId: string;
        filter: DateTrunc;
        startDate: string;
        endDate: string;
    },
    context: { user: any }
) => {
    const { company } = checkPermissions({ hasRole: ["admin"] }, context);
    HourlyCampaignMetric.validate.validateHourlyMetricsArgs(args);
    const { campaignId, filter, startDate, endDate } = args;
    const org = await Org.findOne({ where: { name: company } });
    if (!org) throw new Error("org not found");
    const campaign = await Campaign.findOne({
        where: { id: campaignId, org },
        relations: ["org"],
    });
    if (!campaign) throw new Error("campaign not found");
    const { currentTotal } = calculateTier(campaign.totalParticipationScore, campaign.algorithm.tiers);
    const metrics = await HourlyCampaignMetric.getDateGroupedMetrics(filter, startDate, endDate, campaign.id);
    return HourlyCampaignMetric.parseHourlyCampaignMetrics(metrics, filter, currentTotal);
};

export const adminGetHourlyPlatformMetrics = async (
    parent: any,
    args: { filter: DateTrunc; startDate: string; endDate: string },
    context: { user: any }
) => {
    checkPermissions({ hasRole: ["admin"] }, context);
    HourlyCampaignMetric.validate.validateHourlyMetricsArgs(args);
    const { filter, startDate, endDate } = args;
    const metrics = await HourlyCampaignMetric.getDateGroupedMetrics(filter, startDate, endDate);
    return HourlyCampaignMetric.parseHourlyPlatformMetrics(metrics, filter);
};

export const generateCampaignAuditReport = async (
    parent: any,
    args: { campaignId: string },
    context: { user: any }
) => {
    const { company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
    const { campaignId } = args;
    const campaign = await Campaign.findCampaignById(campaignId, company);
    if (!campaign) throw new Error("Campaign not found");
    const { currentTotal } = await getCurrentCampaignTier(null, { campaign });
    const bigNumTotal = new BN(campaign.type !== "coiin" ? 0 : currentTotal);
    const auditReport: CampaignAuditReport = {
        totalClicks: new BN(0),
        totalViews: new BN(0),
        totalSubmissions: new BN(0),
        totalLikes: new BN(0),
        totalShares: new BN(0),
        totalParticipationScore: campaign.totalParticipationScore,
        totalRewardPayout: bigNumTotal,
        flaggedParticipants: [],
    };
    for (const participant of campaign.participants) {
        const { totalLikes, totalShares } = await calculateParticipantSocialScore(participant, campaign);
        auditReport.totalShares = auditReport.totalShares.plus(totalShares);
        auditReport.totalLikes = auditReport.totalLikes.plus(totalLikes);
        auditReport.totalClicks = auditReport.totalClicks.plus(participant.clickCount);
        auditReport.totalViews = auditReport.totalViews.plus(participant.viewCount);
        auditReport.totalSubmissions = auditReport.totalSubmissions.plus(participant.submissionCount);
        const totalParticipantPayout = await calculateParticipantPayout(bigNumTotal, campaign, participant);

        const condition =
            campaign.type === "raffle"
                ? participant.participationScore.gt(auditReport.totalParticipationScore.times(new BN(0.15)))
                : totalParticipantPayout.gt(auditReport.totalRewardPayout.times(new BN(0.15)));

        if (condition) {
            auditReport.flaggedParticipants.push({
                participantId: participant.id,
                viewPayout: participant.viewCount.times(campaign.algorithm.pointValues.views),
                clickPayout: participant.clickCount.times(campaign.algorithm.pointValues.clicks),
                submissionPayout: participant.submissionCount.times(campaign.algorithm.pointValues.submissions),
                likesPayout: totalLikes.times(campaign.algorithm.pointValues.likes),
                sharesPayout: totalShares.times(campaign.algorithm.pointValues.shares),
                totalPayout: totalParticipantPayout,
            });
        }
    }
    const report: { [key: string]: any } = auditReport;
    for (const key in report) {
        if (key === "flaggedParticipants") {
            for (const flagged of report[key]) {
                for (const value in flagged) {
                    if (value !== "participantId") flagged[value] = parseFloat(flagged[value].toString());
                }
            }
            continue;
        }
        report[key] = parseFloat(report[key].toString());
    }
    return auditReport;
};

export const payoutCampaignRewards = async (parent: any, args: { campaignId: string }, context: { user: any }) => {
    const { company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
    const { campaignId } = args;
    const campaign = await Campaign.findOneOrFail({
        where: { id: campaignId, company },
    });
    if (!campaign) throw new Error("Campaign not found");
    campaign.auditStatus = "PENDING";
    await campaign.save();
    return {
        success: true,
        message: "Campaign has been submitted for auditting",
    };
};
