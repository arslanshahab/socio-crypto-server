import { CampaignAuditReport, CampaignStatus, DateTrunc, NewCampaignVariables, ListCampaignsVariables } from "../types";
import { Campaign } from "../models/Campaign";
import { Admin } from "../models/Admin";
import { checkPermissions } from "../middleware/authentication";
import { Participant } from "../models/Participant";
import { S3Client } from "../clients/s3";
import { In, ILike } from "typeorm";
import { User } from "../models/User";
import { SocialPost } from "../models/SocialPost";
import { Firebase } from "../clients/firebase";
import { calculateParticipantPayout, calculateParticipantSocialScore, calculateTier } from "./helpers";
import { Transfer } from "../models/Transfer";
import { BN } from "../util";
import { Validator } from "../schemas";
import { Org } from "../models/Org";
import { HourlyCampaignMetric } from "../models/HourlyCampaignMetric";
import { DailyParticipantMetric } from "../models/DailyParticipantMetric";
import { RafflePrize } from "../models/RafflePrize";
import { Escrow } from "../models/Escrow";
import { getTokenPriceInUsd } from "../clients/ethereum";
import { CampaignMedia } from "../models/CampaignMedia";
import { CampaignTemplate } from "../models/CampaignTemplate";
import { addYears } from "date-fns";
import { RAIINMAKER_ORG_NAME } from "../util/constants";
import { JWTPayload } from "src/types";
import {
    ERROR_CALCULATING_TIER,
    FormattedError,
    GLOBAL_CAMPAIGN_EXIST_FOR_CURRENCY,
    RAFFLE_PRIZE_MISSING,
    COMPANY_NOT_SPECIFIED,
    CAMPAIGN_NAME_EXISTS,
    CAMPAIGN_NOT_FOUND,
    CAMPAIGN_ORGANIZATION_MISSING,
    ORG_NOT_FOUND,
    MISSING_PARAMS,
    ADMIN_NOT_FOUND,
} from "../util/errors";
import { TatumClient } from "../clients/tatumClient";
import { Wallet } from "../models/Wallet";

const validator = new Validator();

export const getCurrentCampaignTier = async (parent: any, args: { campaignId?: string; campaign?: Campaign }) => {
    try {
        const { campaignId, campaign } = args;
        let currentTierSummary;
        let currentCampaign;
        let cryptoPriceUsd;

        if (campaignId) {
            const where: { [key: string]: string } = { id: campaignId };
            currentCampaign = await Campaign.findOne({ where });
            if (!currentCampaign) throw new Error(ORG_NOT_FOUND);
            if (currentCampaign.type == "raffle") return { currentTier: -1, currentTotal: 0 };
            currentTierSummary = calculateTier(
                currentCampaign.totalParticipationScore,
                currentCampaign.algorithm.tiers
            );
            if (currentCampaign.crypto) cryptoPriceUsd = await getTokenPriceInUsd(currentCampaign.crypto.type);
        } else if (campaign) {
            if (campaign.type == "raffle") return { currentTier: -1, currentTotal: 0 };
            currentTierSummary = calculateTier(campaign.totalParticipationScore, campaign.algorithm.tiers);
            if (campaign.crypto) cryptoPriceUsd = await getTokenPriceInUsd(campaign.crypto.type);
        }
        if (!currentTierSummary) throw new Error(ERROR_CALCULATING_TIER);
        let body: any = {
            currentTier: currentTierSummary.currentTier,
            currentTotal: parseFloat(currentTierSummary.currentTotal.toString()),
        };
        if (campaign) body.campaignType = campaign.type;
        if (currentCampaign) body.campaignType = currentCampaign.type;
        if (cryptoPriceUsd) body.tokenValueUsd = cryptoPriceUsd.toString();
        if (cryptoPriceUsd) body.tokenValueCoiin = cryptoPriceUsd.times(10).toString();
        return body;
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const createNewCampaign = async (parent: any, args: NewCampaignVariables, context: { user: any }) => {
    try {
        const { role, company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
        let {
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
            network,
            campaignType,
            socialMediaType,
            campaignMedia,
            campaignTemplates,
            isGlobal,
            showUrl,
        } = args;
        if (isGlobal) {
            if (await Campaign.findOne({ where: { isGlobal, symbol } }))
                throw new Error(GLOBAL_CAMPAIGN_EXIST_FOR_CURRENCY);
            const globalEndDate = addYears(new Date(endDate), 100);
            endDate = globalEndDate.toLocaleString();
        }

        validator.validateAlgorithmCreateSchema(JSON.parse(algorithm));
        if (!!requirements) validator.validateCampaignRequirementsSchema(requirements);
        if (type === "raffle") {
            if (!rafflePrize) throw new Error(RAFFLE_PRIZE_MISSING);
            validator.validateRafflePrizeSchema(rafflePrize);
        }
        if (role === "admin" && !args.company) throw new Error(COMPANY_NOT_SPECIFIED);
        const campaignCompany = role === "admin" ? args.company : company;
        const org = await Org.findOne({
            where: { name: company },
            relations: ["wallet", "wallet.walletCurrency"],
        });
        if (!org) throw new Error(ORG_NOT_FOUND);
        const wallet = await Wallet.findOne({ where: { org } });
        if (!wallet) throw new Error("Wallet not found.");
        let currency;
        if (type === "crypto") {
            currency = await TatumClient.findOrCreateCurrency({ symbol, network, wallet });
        }
        if (await Campaign.findOne({ name: ILike(name) })) return new Error(CAMPAIGN_NAME_EXISTS);
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
            isGlobal,
            showUrl,
            targetVideo,
            org,
            currency
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
                raffleImageSignedURL = await S3Client.generateCampaignSignedURL(
                    `rafflePrize/${campaign.id}/${prize.id}`
                );
            }
        }
        if (campaignMedia.length) {
            campaignMedia.forEach(async (item) => {
                if (item.media && item.mediaFormat) {
                    let urlObject = { name: "", channel: "", signedUrl: "" };
                    urlObject.signedUrl = await S3Client.generateCampaignSignedURL(
                        `campaign/${campaign.id}/${item.media}`
                    );
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
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const updateCampaign = async (parent: any, args: NewCampaignVariables, context: { user: any }) => {
    try {
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
            showUrl,
        } = args;
        validator.validateAlgorithmCreateSchema(JSON.parse(algorithm));
        if (!!requirements) validator.validateCampaignRequirementsSchema(requirements);
        if (type === "raffle") {
            if (!rafflePrize) throw new Error(RAFFLE_PRIZE_MISSING);
            validator.validateRafflePrizeSchema(rafflePrize);
        }
        if (role === "admin" && !args.company) throw new Error(COMPANY_NOT_SPECIFIED);
        const org = await Org.findOne({
            where: { name: company },
            relations: ["wallet", "wallet.walletCurrency"],
        });
        if (!org) throw new Error(ORG_NOT_FOUND);
        const campaign = await Campaign.findOne({ where: { id: id }, relations: ["campaignTemplates"] });
        if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
        let campaignImageSignedURL = "";
        let raffleImageSignedURL = "";
        let mediaUrls: any = [];
        campaign.showUrl = showUrl;
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
            for (let index = 0; index < campaign.campaignTemplates.length; index++) {
                const template = campaign.campaignTemplates[index];
                if (!campaignTemplates.find((item) => item.id === template.id)) {
                    await template.remove();
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
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const adminUpdateCampaignStatus = async (
    parent: any,
    args: { status: CampaignStatus; campaignId: string },
    context: { user: any }
) => {
    try {
        checkPermissions({ restrictCompany: RAIINMAKER_ORG_NAME }, context);
        const { status, campaignId } = args;
        const campaign = await Campaign.findOne({
            where: { id: campaignId },
            relations: ["org", "currency", "currency.token"],
        });
        if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
        if (!campaign.org) throw new Error(CAMPAIGN_ORGANIZATION_MISSING);
        switch (status) {
            case "APPROVED":
                if (campaign.type === "raffle") {
                    campaign.status = "APPROVED";
                    break;
                }
                const walletBalance = await campaign.org.getAvailableBalance(campaign.currency.token);
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
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const listCampaigns = async (parent: any, args: ListCampaignsVariables, context: { user: any }) => {
    try {
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
        const data = results.map(async (result) => await result.asV2());
        return { results: data, total };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const listCampaignsV2 = async (parent: any, args: ListCampaignsVariables, context: { user: JWTPayload }) => {
    const user = await User.findUserByContext(context.user);
    const [results, total] = await Campaign.findCampaignsByStatusV2(args, user);
    const data = results.map(async (result) => await result.asV2());
    return { results: data, total };
};

export const adminListPendingCampaigns = async (
    parent: any,
    args: { skip: number; take: number },
    context: { user: any }
) => {
    try {
        checkPermissions({ restrictCompany: RAIINMAKER_ORG_NAME }, context);
        const { skip = 0, take = 10 } = args;
        const [results, total] = await Campaign.adminListCampaignsByStatus(skip, take);
        return { results: results.map(async (result) => await result.asV1()), total };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const deleteCampaign = async (parent: any, args: { id: string }, context: { user: any }) => {
    try {
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
        if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
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
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const get = async (parent: any, args: { id: string }) => {
    try {
        const { id } = args;
        const where: { [key: string]: string } = { id };
        const campaign = await Campaign.findOne({
            where,
            relations: ["participants", "prize", "campaignMedia", "campaignTemplates", "currency", "currency.token"],
        });
        if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
        campaign.participants.sort((a, b) => {
            return parseFloat(b.participationScore.minus(a.participationScore).toString());
        });
        return campaign.asV2();
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const publicGet = async (parent: any, args: { campaignId: string }) => {
    try {
        const { campaignId } = args;
        const campaign = await Campaign.findOne({ where: { id: campaignId } });
        if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
        return campaign.asV1();
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const adminGetCampaignMetrics = async (parent: any, args: { campaignId: string }, context: { user: any }) => {
    try {
        checkPermissions({ hasRole: ["admin"] }, context);
        const { campaignId } = args;
        const campaign = await Campaign.findOne({ where: { id: campaignId } });
        if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
        return await Campaign.getCampaignMetrics(campaignId);
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const adminGetPlatformMetrics = async (parent: any, args: any, context: { user: any }) => {
    try {
        checkPermissions({ hasRole: ["admin"] }, context);
        const metrics = await Campaign.getPlatformMetrics();
        return metrics;
    } catch (error) {
        throw new FormattedError(error);
    }
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
    try {
        const { company } = checkPermissions({ hasRole: ["admin"] }, context);
        HourlyCampaignMetric.validate.validateHourlyMetricsArgs(args);
        const { campaignId, filter, startDate, endDate } = args;
        const org = await Org.findOne({ where: { name: company } });
        if (!org) throw new Error(ORG_NOT_FOUND);
        const campaign = await Campaign.findOne({
            where: { id: campaignId, org },
            relations: ["org"],
        });
        if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
        const { currentTotal } = calculateTier(campaign.totalParticipationScore, campaign.algorithm.tiers);
        const metrics = await HourlyCampaignMetric.getDateGroupedMetrics(filter, startDate, endDate, campaign.id);
        return HourlyCampaignMetric.parseHourlyCampaignMetrics(metrics, filter, currentTotal);
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const adminGetHourlyPlatformMetrics = async (
    parent: any,
    args: { filter: DateTrunc; startDate: string; endDate: string },
    context: { user: any }
) => {
    try {
        checkPermissions({ hasRole: ["admin"] }, context);
        HourlyCampaignMetric.validate.validateHourlyMetricsArgs(args);
        const { filter, startDate, endDate } = args;
        const metrics = await HourlyCampaignMetric.getDateGroupedMetrics(filter, startDate, endDate);
        return HourlyCampaignMetric.parseHourlyPlatformMetrics(metrics, filter);
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const generateCampaignAuditReport = async (
    parent: any,
    args: { campaignId: string },
    context: { user: any }
) => {
    try {
        const { company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
        const { campaignId } = args;
        const campaign = await Campaign.findCampaignById(campaignId, company);
        if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
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
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const payoutCampaignRewards = async (parent: any, args: { campaignId: string }, context: { user: any }) => {
    try {
        const { company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
        const { campaignId } = args;
        const campaign = await Campaign.findOneOrFail({
            where: { id: campaignId, company },
        });
        if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
        campaign.auditStatus = "PENDING";
        await campaign.save();
        return {
            success: true,
            message: "Campaign has been submitted for auditting",
        };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const listAllCampaignsForOrg = async (parent: any, args: any, context: { user: any }) => {
    try {
        const userId = context.user.id;
        checkPermissions({ hasRole: ["admin"] }, context);
        const admin = await Admin.findOne({ where: { firebaseId: userId }, relations: ["org"] });
        if (!admin) throw new Error(ADMIN_NOT_FOUND);
        const campaigns = await Campaign.find({ where: { org: admin.org } });
        return campaigns.map((x) => ({ id: x.id, name: x.name }));
    } catch (error) {
        throw new FormattedError(error);
    }
};
//! Dashboard Metrics
export const getDashboardMetrics = async (parent: any, { campaignId, skip, take }: any, context: { user: any }) => {
    try {
        const userId = context.user.id;
        checkPermissions({ hasRole: ["admin"] }, context);
        const admin = await Admin.findOne({ where: { firebaseId: userId }, relations: ["org"] });
        if (!admin) throw new Error(ADMIN_NOT_FOUND);
        const { org } = admin;
        if (!org) throw new Error(ORG_NOT_FOUND);
        const orgId = await admin.org.id;
        let campaignMetrics;
        let aggregatedCampaignMetrics;
        let totalParticipants;
        if (!campaignId) throw new Error(MISSING_PARAMS);
        if (orgId && campaignId == "-1") {
            aggregatedCampaignMetrics = await DailyParticipantMetric.getAggregatedOrgMetrics(orgId);
            aggregatedCampaignMetrics = { ...aggregatedCampaignMetrics, campaignName: "All" };
            campaignMetrics = await DailyParticipantMetric.getOrgMetrics(orgId);
            totalParticipants = await Participant.count({
                where: {
                    campaign: In(await (await Campaign.find({ where: { org: admin?.org } })).map((item) => item.id)),
                },
            });
        }
        if (campaignId && campaignId != "-1") {
            aggregatedCampaignMetrics = await DailyParticipantMetric.getAggregatedCampaignMetrics(campaignId);
            campaignMetrics = await DailyParticipantMetric.getCampaignMetrics(campaignId);
            totalParticipants = await Participant.count({
                where: {
                    campaign: In([campaignId]),
                },
            });
        }
        const aggregaredMetrics = { ...aggregatedCampaignMetrics, totalParticipants };
        return { aggregatedCampaignMetrics: aggregaredMetrics, campaignMetrics };
    } catch (error) {
        throw new FormattedError(error);
    }
};
