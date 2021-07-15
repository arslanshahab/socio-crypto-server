import { CampaignAuditReport, CampaignStatus, DateTrunc } from "../types";
import { Campaign } from "../models/Campaign";
import { checkPermissions } from "../middleware/authentication";
import { Participant } from "../models/Participant";
import { S3Client } from "../clients/s3";
import { EntityManager, getConnection, In } from "typeorm";
import { User } from "../models/User";
import { Wallet } from "../models/Wallet";
import { SocialPost } from "../models/SocialPost";
import { getParticipant } from "./participant";
import { Firebase } from "../clients/firebase";
import { Dragonchain } from "../clients/dragonchain";
import {
    calculateParticipantPayout,
    calculateParticipantSocialScore,
    calculateRaffleWinner,
    calculateTier,
    FEE_RATE,
    performCurrencyTransfer,
} from "./helpers";
import { Transfer } from "../models/Transfer";
import { BN } from "../util/helpers";
import { BigNumber } from "bignumber.js";
import { Validator } from "../schemas";
import { CampaignRequirementSpecs, RafflePrizeStructure } from "../types";
import { Org } from "../models/Org";
import { HourlyCampaignMetric } from "../models/HourlyCampaignMetric";
import { DailyParticipantMetric } from "../models/DailyParticipantMetric";
import { RafflePrize } from "../models/RafflePrize";
import { SesClient } from "../clients/ses";
import { decrypt } from "../util/crypto";
import { Escrow } from "../models/Escrow";
import { WalletCurrency } from "../models/WalletCurrency";
import { CryptoCurrency } from "../models/CryptoCurrency";
import { getTokenPriceInUsd } from "../clients/ethereum";

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
        company: string;
        algorithm: string;
        image: string;
        sharedMedia: string;
        tagline: string;
        requirements: CampaignRequirementSpecs;
        suggestedPosts: string[];
        suggestedTags: string[];
        keywords: string[];
        type: string;
        rafflePrize: RafflePrizeStructure;
        cryptoId: string;
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
        algorithm,
        targetVideo,
        image,
        sharedMedia,
        tagline,
        requirements,
        suggestedPosts,
        suggestedTags,
        keywords,
        type = "crypto",
        rafflePrize,
        cryptoId,
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
        relations: ["wallet"],
    });
    if (!org) throw new Error("org not found");
    let cryptoCurrency;
    if (type === "crypto") {
        const walletCurrency = await WalletCurrency.findOne({
            where: { wallet: org.wallet, id: cryptoId },
        });
        if (!walletCurrency) throw new Error("currency not found in wallet");
        cryptoCurrency = await CryptoCurrency.findOne({
            where: { type: walletCurrency.type.toLowerCase() },
        });
        if (!cryptoCurrency) throw new Error("this currency is not supported");
    }
    const campaign = Campaign.newCampaign(
        name,
        beginDate,
        endDate,
        coiinTotal,
        target,
        description,
        campaignCompany,
        algorithm,
        tagline,
        requirements,
        suggestedPosts,
        suggestedTags,
        keywords,
        type,
        targetVideo,
        org,
        cryptoCurrency
    );
    await campaign.save();
    let campaignImageSignedURL = "";
    let sharedMediaSignedURL = "";
    let raffleImageSignedURL = "";
    if (image) {
        campaignImageSignedURL = await S3Client.generateCampaignSignedURL(`campaign/${campaign.id}/${image}`);
        await campaign.save();
    }
    if (sharedMedia) {
        sharedMediaSignedURL = await S3Client.generateCampaignSignedURL(`campaign/${campaign.id}/${sharedMedia}`);
        await campaign.save();
    }
    if (type === "raffle") {
        const prize = RafflePrize.newFromCampaignCreate(campaign, rafflePrize);
        await prize.save();
        if (rafflePrize.image && rafflePrize.image !== "") {
            raffleImageSignedURL = await S3Client.generateCampaignSignedURL(`rafflePrize/${campaign.id}/${prize.id}`);
        }
    }
    const deviceTokens = await User.getAllDeviceTokens("campaignCreate");
    if (deviceTokens.length > 0) await Firebase.sendCampaignCreatedNotifications(deviceTokens, campaign);
    return {
        campaignId: campaign.id,
        campaignImageSignedURL: campaignImageSignedURL,
        sharedMediaSignedURL: sharedMediaSignedURL,
        raffleImageSignedURL: raffleImageSignedURL,
    };
};

export const saveCampaignImages = async (
    parent: any,
    args: {
        id: string;
        image: string;
        sharedMedia: string;
        sharedMediaFormat: string;
    },
    context: { user: any }
) => {
    const { role, company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
    const { id, image, sharedMedia, sharedMediaFormat } = args;
    const where: { [key: string]: string } = { id };
    if (role === "manager") where["company"] = company;
    const campaign = await Campaign.findOne({ where });
    if (!campaign) throw new Error("campaign not found");
    if (image) campaign.imagePath = image;
    if (sharedMedia) campaign.sharedMedia = sharedMedia;
    if (sharedMediaFormat) campaign.sharedMedia = sharedMediaFormat;
    await campaign.save();
    return campaign.asV1();
};

export const generateCampaignSignedUrls = async (
    parent: any,
    args: {
        id: string;
        campaignImageFileName: string;
        sharedMediaFileName: string;
    },
    context: { user: any }
) => {
    const { role, company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
    const { id, campaignImageFileName, sharedMediaFileName } = args;
    const where: { [key: string]: string } = { id };
    if (role === "manager") where["company"] = company;
    const campaign = await Campaign.findOne({ where, relations: ["prize"] });
    if (!campaign) throw new Error("campaign not found");
    let campaignImageSignedURL = "";
    let sharedMediaSignedURL = "";
    let raffleImageSignedURL = "";
    if (campaignImageFileName) {
        campaignImageSignedURL = await S3Client.generateCampaignSignedURL(
            `campaign/${campaign.id}/${campaignImageFileName}`
        );
        await campaign.save();
    }
    if (sharedMediaFileName) {
        sharedMediaSignedURL = await S3Client.generateCampaignSignedURL(
            `campaign/${campaign.id}/${sharedMediaFileName}`
        );
        await campaign.save();
    }
    if (campaign.prize && campaign.prize.image) {
        raffleImageSignedURL = await S3Client.generateCampaignSignedURL(
            `rafflePrize/${campaign.id}/${campaign.prize.id}`
        );
    }
    return {
        campaignId: campaign.id,
        campaignImageSignedURL: campaignImageSignedURL,
        sharedMediaSignedURL: sharedMediaSignedURL,
        raffleImageSignedURL: raffleImageSignedURL,
    };
};

export const updateCampaign = async (
    parent: any,
    args: {
        id: string;
        name: string;
        beginDate: string;
        targetVideo: string;
        endDate: string;
        coiinTotal: number;
        target: string;
        description: string;
        algorithm: string;
        suggestedPosts: string[];
        suggestedTags: string[];
        image: string;
    },
    context: { user: any }
) => {
    const { role, company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
    const {
        id,
        name,
        beginDate,
        endDate,
        coiinTotal,
        target,
        description,
        algorithm,
        targetVideo,
        suggestedPosts,
        suggestedTags,
        image,
    } = args;
    const where: { [key: string]: string } = { id };
    if (role === "manager") where["company"] = company;
    const campaign = await Campaign.findOne({ where });
    if (!campaign) throw new Error("campaign not found");
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
    if (image) campaign.imagePath = await S3Client.setCampaignImage("banner", campaign.id, image);
    await campaign.save();
    return campaign.asV1();
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
        relations: ["org", "org.wallet", "crypto"],
    });
    if (!campaign) throw new Error("campaign not found");
    switch (status) {
        case "APPROVED":
            if (campaign.type == "raffle") {
                campaign.status = "APPROVED";
                await campaign.save();
                return true;
            }
            const walletCurrency = await WalletCurrency.getFundingWalletCurrency(
                campaign.crypto.type,
                campaign.org.wallet
            );
            if (walletCurrency.balance.lt(campaign.coiinTotal)) {
                campaign.status = "INSUFFICIENT_FUNDS";
            } else {
                campaign.status = "APPROVED";
                const escrow = Escrow.newCampaignEscrow(campaign, campaign.org.wallet);
                walletCurrency.balance = walletCurrency.balance.minus(campaign.coiinTotal);
                await walletCurrency.save();
                await escrow.save();
            }
            break;
        case "DENIED":
            campaign.status = "DENIED";
            break;
    }
    await campaign.save();
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
    return { results: results.map((result) => result.asV1()), total };
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
        relations: ["participants", "posts", "dailyMetrics", "hourlyMetrics", "prize", "payouts", "escrow"],
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
    await campaign.remove();
    return campaign.asV1();
};

export const get = async (parent: any, args: { id: string }) => {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const campaign = await Campaign.findOne({
        where,
        relations: ["participants", "prize"],
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

export const payoutCampaignRewards = async (
    parent: any,
    args: { campaignId: string; rejected: string[] },
    context: { user: any }
) => {
    const { company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
    return getConnection().transaction(async (transactionalEntityManager) => {
        const { campaignId, rejected } = args;
        const campaign = await Campaign.findOneOrFail({
            where: { id: campaignId, company },
            relations: ["participants", "prize", "org", "org.wallet", "escrow"],
        });
        let deviceIds;
        switch (campaign.type) {
            case "crypto":
            case "coiin":
                deviceIds = await payoutCoiinCampaignRewards(transactionalEntityManager, campaign, rejected);
                break;
            case "raffle":
                deviceIds = await payoutRaffleCampaignRewards(transactionalEntityManager, campaign, rejected);
                break;
            default:
                throw new Error("campaign type is invalid");
        }
        if (deviceIds) await Firebase.sendCampaignCompleteNotifications(Object.values(deviceIds), campaign.name);
        return true;
    });
};

const payoutRaffleCampaignRewards = async (entityManager: EntityManager, campaign: Campaign, rejected: string[]) => {
    if (!campaign.prize) throw new Error("no campaign prize");
    if (campaign.participants.length === 0) throw new Error("no participants on campaign for audit");
    let totalParticipationScore = new BN(0).plus(campaign.totalParticipationScore);
    const clonedParticipants =
        rejected.length > 0
            ? campaign.participants.reduce((accum: Participant[], current: Participant) => {
                  if (rejected.indexOf(current.id) > -1)
                      totalParticipationScore = totalParticipationScore.minus(current.participationScore);
                  else accum.push(current);
                  return accum;
              }, [])
            : campaign.participants;
    const winner = calculateRaffleWinner(totalParticipationScore, clonedParticipants);
    const wallet = await Wallet.findOneOrFail({ where: { user: winner.user } });
    const prize = await RafflePrize.findOneOrFail({
        where: { id: campaign.prize.id },
    });
    const transfer = Transfer.newFromRaffleSelection(wallet, campaign, prize);
    campaign.audited = true;
    await entityManager.save([campaign, wallet, transfer]);
    await SesClient.sendRafflePrizeRedemptionEmail(winner.user.id, decrypt(winner.email), campaign);
    await Dragonchain.ledgerRaffleCampaignAudit({ [winner.user.id]: campaign.prize.displayName }, [], campaign.id);
    return { [winner.user.id]: winner.user.profile.deviceToken };
};

const payoutCoiinCampaignRewards = async (entityManager: EntityManager, campaign: Campaign, rejected: string[]) => {
    const usersWalletValues: { [key: string]: BigNumber } = {};
    const userDeviceIds: { [key: string]: string } = {};
    const transfers: Transfer[] = [];
    const { currentTotal } = await getCurrentCampaignTier(null, { campaign });
    const bigNumTotal = new BN(currentTotal);
    const participants = await Participant.find({
        where: { campaign },
        relations: ["user"],
    });
    let escrow = await Escrow.findOne({
        where: { campaign },
        relations: ["wallet"],
    });
    if (!escrow) throw new Error("escrow not found");
    let totalFee = new BN(0);
    let totalPayout = new BN(0);
    const users =
        participants.length > 0
            ? await User.find({
                  where: { id: In(participants.map((p) => p.user.id)) },
                  relations: ["wallet"],
              })
            : [];
    const wallets =
        users.length > 0
            ? await Wallet.find({
                  where: { id: In(users.map((u) => u.wallet.id)) },
                  relations: ["user"],
              })
            : [];
    if (rejected.length > 0) {
        const newParticipationCount = participants.length - rejected.length;
        let totalRejectedPayout = new BN(0);
        for (const id of rejected) {
            const participant = await getParticipant(null, { id });
            const totalParticipantPayout = await calculateParticipantPayout(bigNumTotal, campaign, participant);
            totalRejectedPayout = totalRejectedPayout.plus(totalParticipantPayout);
        }
        const addedPayoutToEachParticipant = totalRejectedPayout.div(new BN(newParticipationCount));
        for (const participant of participants) {
            if (!rejected.includes(participant.id)) {
                const subtotal = await calculateParticipantPayout(bigNumTotal, campaign, participant);
                const totalParticipantPayout = subtotal.plus(addedPayoutToEachParticipant);
                if (participant.user.profile.deviceToken)
                    userDeviceIds[participant.user.id] = participant.user.profile.deviceToken;
                if (!usersWalletValues[participant.user.id])
                    usersWalletValues[participant.user.id] = totalParticipantPayout;
                else
                    usersWalletValues[participant.user.id] =
                        usersWalletValues[participant.user.id].plus(totalParticipantPayout);
            }
        }
    } else {
        for (const participant of participants) {
            const totalParticipantPayout = await calculateParticipantPayout(bigNumTotal, campaign, participant);
            if (participant.user.profile.deviceToken)
                userDeviceIds[participant.user.id] = participant.user.profile.deviceToken;
            if (!usersWalletValues[participant.user.id])
                usersWalletValues[participant.user.id] = totalParticipantPayout;
            else
                usersWalletValues[participant.user.id] =
                    usersWalletValues[participant.user.id].plus(totalParticipantPayout);
        }
    }
    for (const userId in usersWalletValues) {
        const currentWallet = wallets.find((w) => w.user.id === userId);
        if (currentWallet) {
            const allottedPayment = usersWalletValues[userId];
            if (new BN(allottedPayment).isGreaterThan(0)) {
                const fee = new BN(allottedPayment).times(FEE_RATE);
                const payout = new BN(allottedPayment).minus(fee);
                totalFee = totalFee.plus(fee);
                totalPayout = totalPayout.plus(allottedPayment);
                await performCurrencyTransfer(
                    escrow.id,
                    currentWallet.id,
                    campaign.crypto.type,
                    payout.toString(),
                    true
                );
                const transfer = Transfer.newFromCampaignPayout(currentWallet, campaign, payout);
                transfers.push(transfer);
            }
        }
    }
    if (new BN(totalFee).isGreaterThan(0)) await Transfer.transferCampaignPayoutFee(campaign, totalFee);
    const payoutTransfer = Transfer.newFromWalletPayout(escrow.wallet, campaign, totalPayout);
    transfers.push(payoutTransfer);
    escrow = await Escrow.findOneOrFail({
        where: { campaign },
        relations: ["wallet"],
    });
    if (escrow.amount.gt(0)) {
        await performCurrencyTransfer(
            escrow.id,
            escrow.wallet.id,
            campaign.crypto.type,
            escrow.amount.toString(),
            true
        );
        const transfer = Transfer.newFromCampaignPayoutRefund(escrow.wallet, campaign, escrow.amount);
        await transfer.save();
        await escrow.remove();
    } else {
        await escrow.remove();
    }
    campaign.audited = true;
    await entityManager.save(campaign);
    await entityManager.save(participants);
    await entityManager.save(transfers);

    await Dragonchain.ledgerCoiinCampaignAudit(usersWalletValues, rejected, campaign.id);
    return userDeviceIds;
};
