import { Request, Response } from "express";
import { getManager } from "typeorm";
import { RedisStore, getGraphQLRateLimiter } from "graphql-rate-limit";
import { Campaign } from "../models/Campaign";
import { User } from "../models/User";
import { Dragonchain } from "../clients/dragonchain";
import { Participant } from "../models/Participant";
import { SocialPost } from "../models/SocialPost";
import { getTweetById } from "../controllers/social";
import { getRedis } from "../clients/redis";
import { BN, asyncHandler, calculateQualityTierMultiplier, getCryptoAssestImageUrl, formatFloat } from "../util";
import { DailyParticipantMetric } from "../models/DailyParticipantMetric";
import {
    getDatesBetweenDates,
    formatUTCDateForComparision,
    calculateTier,
    calculateParticipantPayout,
} from "./helpers";
import { HourlyCampaignMetric } from "../models/HourlyCampaignMetric";
import { QualityScore } from "../models/QualityScore";
import { limit } from "../util/rateLimiter";
import { JWTPayload } from "src/types";
import { getTokenValueInUSD } from "../util/exchangeRate";
import { GetCampaignsParticipantsVariables } from "../types.d";
import {
    FormattedError,
    CAMPAIGN_CLOSED,
    CAMPAIGN_NOT_FOUND,
    MISSING_PARAMS,
    PARTICIPANT_NOT_FOUND,
    USER_NOT_FOUND,
} from "../util/errors";
import { DragonchainService } from "../services/DragonchainService";
import { ParticipantAction } from "../util/constants";

const { RATE_LIMIT_MAX = "3", RATE_LIMIT_WINDOW = "1m" } = process.env;

const rateLimiter = getGraphQLRateLimiter({
    formatError: () => "Too many requests",
    identifyContext: (ctx) => {
        return ctx.connection.remoteAddress || ctx.socket.remoteAddress;
    },
    store: new RedisStore(getRedis().client),
});

export const getParticipantByCampaignId = async (parent: any, args: { campaignId: string }, context: { user: any }) => {
    const user = await User.findUserByContext(context.user);
    const campaign = await Campaign.findOneOrFail({ where: { id: args.campaignId } });
    const particpant = await Participant.findOneOrFail({ where: { user, campaign }, relations: ["user", "campaign"] });
    return particpant.asV1();
};

export const trackAction = async (
    parent: any,
    args: { participantId: string; action: "clicks" | "views" | "submissions" },
    context: any,
    info: any
) => {
    const errorMessage = await rateLimiter(
        { parent: {}, args, context, info },
        { max: Number(RATE_LIMIT_MAX), window: RATE_LIMIT_WINDOW }
    );
    if (errorMessage) throw new Error(errorMessage);
    if (!["views", "submissions"].includes(args.action)) throw new Error(MISSING_PARAMS);
    const participant = await Participant.findOne({
        where: { id: args.participantId },
        relations: ["campaign", "campaign.org", "user"],
    });
    if (!participant) throw new Error(PARTICIPANT_NOT_FOUND);
    const campaign = participant.campaign;
    if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
    if (!participant.campaign.isOpen()) throw new Error(CAMPAIGN_CLOSED);
    let qualityScore = await QualityScore.findOne({ where: { participantId: participant.id } });
    if (!qualityScore) qualityScore = QualityScore.newQualityScore(participant.id);
    let multiplier;
    switch (args.action) {
        case "views":
            participant.viewCount = participant.viewCount.plus(new BN(1));
            multiplier = calculateQualityTierMultiplier(qualityScore.views);
            break;
        case "submissions":
            participant.submissionCount = participant.submissionCount.plus(new BN(1));
            multiplier = calculateQualityTierMultiplier(qualityScore.submissions);
            break;
        default:
            throw new Error("Action not supported");
    }
    const pointValue = campaign.algorithm.pointValues[args.action].times(multiplier);
    campaign.totalParticipationScore = campaign.totalParticipationScore.plus(pointValue);
    participant.participationScore = participant.participationScore.plus(pointValue);
    const hourlyMetric = await HourlyCampaignMetric.upsert(campaign, campaign.org, args.action, undefined, false);
    const dailyMetric = await DailyParticipantMetric.upsert(
        participant.user,
        campaign,
        participant,
        args.action,
        pointValue,
        undefined,
        false
    );
    await getManager().save([campaign, participant, hourlyMetric, dailyMetric, qualityScore]);
    await Dragonchain.ledgerCampaignAction(args.action, participant.id, participant.campaign.id);
    return participant.asV1();
};

export const getParticipant = async (parent: any, args: { id: string }) => {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const participant = await Participant.findOne({ where, relations: ["user", "campaign"] });
    if (!participant) throw new Error(PARTICIPANT_NOT_FOUND);
    return participant.asV1();
};

export const getCampaignParticipants = async (parent: any, args: GetCampaignsParticipantsVariables) => {
    const { campaignId, skip, take } = args;
    const [results, total] = await Participant.findAndCount({
        where: { ...(campaignId && { campaign: await Campaign.findOne({ where: { id: campaignId } }) }) },
        relations: ["user", "campaign"],
        skip,
        take,
    });
    const data = results.map(async (result) => await result.asV2());
    return {
        total,
        results: data,
    };
};

export const getPosts = async (parent: any, args: { id: string }, context: any) => {
    try {
        const { id } = args;
        const results: Promise<any>[] = [];
        const where: { [key: string]: string } = { id };
        const participant = await Participant.findOne({ where });
        if (!participant) throw new Error(PARTICIPANT_NOT_FOUND);
        const posts = await SocialPost.find({ where: { participantId: participant.id } });
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            try {
                const tweet = await getTweetById(null, { id: post.id, type: "twitter" }, context);
                results.push(tweet);
            } catch (_) {}
        }
        return results;
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const getParticipantMetrics = async (parent: any, args: { participantId: string }, context: { user: any }) => {
    const { participantId } = args;
    const additionalRows = [];
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error(USER_NOT_FOUND);
    const participant = await Participant.findOne({ where: { id: participantId, user }, relations: ["campaign"] });
    if (!participant) throw new Error(PARTICIPANT_NOT_FOUND);
    const metrics = await DailyParticipantMetric.getSortedByParticipantId(participantId);
    if (
        metrics.length > 0 &&
        formatUTCDateForComparision(metrics[metrics.length - 1].createdAt) !== formatUTCDateForComparision(new Date())
    ) {
        const datesInBetween = getDatesBetweenDates(new Date(metrics[metrics.length - 1].createdAt), new Date());
        for (let i = 0; i < datesInBetween.length; i++) {
            additionalRows.push(
                await DailyParticipantMetric.insertPlaceholderRow(
                    datesInBetween[i],
                    metrics[metrics.length - 1].totalParticipationScore,
                    participant.campaign,
                    user,
                    participant
                )
            );
        }
    }
    return metrics.concat(additionalRows).map((metric) => metric.asV1());
};

export const getAccumulatedParticipantMetrics = async (
    parent: any,
    args: { campaignId: string },
    context: { user: JWTPayload }
) => {
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error(USER_NOT_FOUND);
    const campaign = await Campaign.findOne({
        where: { id: args.campaignId },
        relations: ["currency", "currency.token"],
    });
    if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
    const participant = await Participant.findOne({ where: { user, campaign } });
    if (!participant) throw new Error(PARTICIPANT_NOT_FOUND);
    const counts = await DailyParticipantMetric.getAccumulatedParticipantMetrics(participant.id);
    const { currentTotal } = calculateTier(campaign.totalParticipationScore, campaign.algorithm.tiers);
    const participantShare = await calculateParticipantPayout(new BN(currentTotal), campaign, participant);
    return {
        clickCount: counts?.clickCount || 0,
        likeCount: counts?.likeCount || 0,
        shareCount: counts?.shareCount || 0,
        viewCount: counts?.viewCount || 0,
        submissionCount: counts?.submissionCount || 0,
        commentCount: counts?.commentCount || 0,
        participationScore: counts?.participationScore || 0,
        currentTotal: currentTotal.toNumber(),
        participantShare: participantShare.toNumber() || 0,
        participantShareUSD: await getTokenValueInUSD(
            campaign.currency.token.symbol,
            parseFloat(participantShare.toString() || "0")
        ),
        symbol: campaign.symbol,
        symbolImageUrl: getCryptoAssestImageUrl(campaign.symbol),
        campaignId: campaign.id,
        participantId: participant.id,
    };
};

export const getAccumulatedUserMetrics = async (parent: any, args: any, context: { user: JWTPayload }) => {
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error(USER_NOT_FOUND);
    const participations = await Participant.find({ where: { user }, relations: ["campaign"] });
    const ids = participations.map((item) => item.id);
    let counts;
    let participantShare = new BN(0);

    if (ids.length) {
        counts = await DailyParticipantMetric.getAccumulatedUserMetrics(ids);
        for (let index = 0; index < participations.length; index++) {
            const campaign = participations[index].campaign;
            const participant = participations[index];
            const { currentTotal } = calculateTier(campaign.totalParticipationScore, campaign.algorithm.tiers);
            const share = await calculateParticipantPayout(new BN(currentTotal), campaign, participant);
            const usdValue = await getTokenValueInUSD(campaign.symbol, parseFloat(share.toString() || "0"));
            participantShare = participantShare.plus(usdValue);
        }
    }

    return {
        clickCount: counts?.clickCount || 0,
        likeCount: counts?.likeCount || 0,
        shareCount: counts?.shareCount || 0,
        viewCount: counts?.viewCount || 0,
        submissionCount: counts?.submissionCount || 0,
        commentCount: counts?.commentCount || 0,
        totalScore: counts?.participationScore || 0,
        totalShareUSD: formatFloat(participantShare.toNumber()),
    };
};

export const trackClickByLink = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { participantId } = req.params;
        const action = ParticipantAction.CLICKS;
        const ipAddress = req.connection.remoteAddress || req.socket.remoteAddress;
        const shouldRateLimit = await limit(`${ipAddress}-${participantId}-click`, Number(RATE_LIMIT_MAX), "minute");
        if (!participantId)
            return res.status(400).json({ code: "MALFORMED_INPUT", message: "missing participant ID in request" });
        let participant;
        try {
            participant = await Participant.findOne({
                where: { id: participantId },
                relations: ["campaign", "user"],
            });
        } catch (error) {
            return res.status(404).json({ code: "NOT_FOUND", message: "participant not found" });
        }
        if (!participant) return res.status(404).json({ code: "NOT_FOUND", message: "participant not found" });
        const campaign = await Campaign.findOne({ where: { id: participant.campaign.id }, relations: ["org"] });
        if (!campaign) return res.status(404).json({ code: "NOT_FOUND", message: "campaign not found" });
        if (!shouldRateLimit) {
            const dragonchainService = new DragonchainService();
            let qualityScore = await QualityScore.findOne({ where: { participantId: participant.id } });
            if (!qualityScore) qualityScore = QualityScore.newQualityScore(participant.id);
            const multiplier = calculateQualityTierMultiplier(qualityScore.clicks);
            participant.clickCount = participant.clickCount.plus(new BN(1));
            const pointValue = campaign.algorithm.pointValues[action].times(multiplier);
            campaign.totalParticipationScore = campaign.totalParticipationScore.plus(pointValue);
            participant.participationScore = participant.participationScore.plus(pointValue);
            await campaign.save();
            await participant.save();
            await qualityScore.save();
            await HourlyCampaignMetric.upsert(campaign, campaign.org, action);
            await DailyParticipantMetric.upsert(participant.user, campaign, participant, action, pointValue);
            await dragonchainService.ledgerCampaignAction({
                action,
                participantId: participant.id,
                campaignId: participant.campaign.id,
            });
        }
        return res.redirect(campaign.target.includes("https") ? campaign.target : `https://${campaign.target}`);
    } catch (error) {
        throw new FormattedError(error);
    }
});
