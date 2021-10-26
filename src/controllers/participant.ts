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
import { BN, asyncHandler, calculateQualityMultiplier } from "../util/helpers";
import { DailyParticipantMetric } from "../models/DailyParticipantMetric";
import { getDatesBetweenDates, formatUTCDateForComparision } from "./helpers";
import { HourlyCampaignMetric } from "../models/HourlyCampaignMetric";
import { QualityScore } from "../models/QualityScore";
import { limit } from "../util/rateLimiter";

const { RATE_LIMIT_MAX = "3", RATE_LIMIT_WINDOW = "1m" } = process.env;

const rateLimiter = getGraphQLRateLimiter({
    formatError: () => "Too many requests",
    identifyContext: (ctx) => {
        return ctx.connection.remoteAddress || ctx.socket.remoteAddress;
    },
    store: new RedisStore(getRedis().client),
});

export const getParticipantByCampaignId = async (parent: any, args: { campaignId: string }, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id } });
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
    if (!["views", "submissions"].includes(args.action)) throw new Error("invalid metric specified");
    const participant = await Participant.findOne({
        where: { id: args.participantId },
        relations: ["campaign", "campaign.org", "user"],
    });
    if (!participant) throw new Error("participant not found");
    const campaign = participant.campaign;
    if (!campaign) throw new Error("campaign not found");
    if (!participant.campaign.isOpen()) throw new Error("campaign is closed");
    let qualityScore = await QualityScore.findOne({ where: { participantId: participant.id } });
    if (!qualityScore) qualityScore = QualityScore.newQualityScore(participant.id);
    let multiplier;
    switch (args.action) {
        case "views":
            participant.viewCount = participant.viewCount.plus(new BN(1));
            multiplier = calculateQualityMultiplier(qualityScore.views);
            break;
        case "submissions":
            participant.submissionCount = participant.submissionCount.plus(new BN(1));
            multiplier = calculateQualityMultiplier(qualityScore.submissions);
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
    const participant = await Participant.findOne({ where, relations: ["user", "user.tatumAccounts"] });
    if (!participant) throw new Error("participant not found");
    return participant.asV1();
};

export const getPosts = async (parent: any, args: { id: string }, context: any) => {
    try {
        const { id } = args;
        const results: Promise<any>[] = [];
        const where: { [key: string]: string } = { id };
        const participant = await Participant.findOne({ where });
        if (!participant) throw new Error("participant not found");
        const posts = await SocialPost.find({ where: { participantId: participant.id } });
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            try {
                const tweet = await getTweetById(null, { id: post.id, type: "twitter" }, context);
                results.push(tweet);
            } catch (_) {}
        }
        return results;
    } catch (e) {
        console.log("Error: ");
        console.log(e);
        console.log("____");
        return false;
    }
};

export const getParticipantMetrics = async (parent: any, args: { participantId: string }, context: { user: any }) => {
    const { id } = context.user;
    const { participantId } = args;
    const additionalRows = [];
    const user = await User.findOne({ where: { identityId: id } });
    if (!user) throw new Error("user not found");
    const participant = await Participant.findOne({ where: { id: participantId, user }, relations: ["campaign"] });
    if (!participant) throw new Error("participant not found");
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

export const trackClickByLink = asyncHandler(async (req: Request, res: Response) => {
    const { participantId } = req.params;
    const action = "clicks";
    const ipAddress = req.connection.remoteAddress || req.socket.remoteAddress;
    const shouldRateLimit = await limit(`${ipAddress}-${participantId}-click`, Number(RATE_LIMIT_MAX), "minute");
    if (!participantId)
        return res.status(400).json({ code: "MALFORMED_INPUT", message: "missing participant ID in request" });
    const participant = await Participant.findOne({ where: { id: participantId }, relations: ["campaign", "user"] });
    if (!participant) return res.status(404).json({ code: "NOT_FOUND", message: "participant not found" });
    const campaign = await Campaign.findOne({ where: { id: participant.campaign.id }, relations: ["org"] });
    if (!campaign) return res.status(404).json({ code: "NOT_FOUND", message: "campaign not found" });
    if (!shouldRateLimit) {
        let qualityScore = await QualityScore.findOne({ where: { participantId: participant.id } });
        if (!qualityScore) qualityScore = QualityScore.newQualityScore(participant.id);
        const multiplier = calculateQualityMultiplier(qualityScore.clicks);
        participant.clickCount = participant.clickCount.plus(new BN(1));
        const pointValue = campaign.algorithm.pointValues[action].times(multiplier);
        campaign.totalParticipationScore = campaign.totalParticipationScore.plus(pointValue);
        participant.participationScore = participant.participationScore.plus(pointValue);
        await campaign.save();
        await participant.save();
        await qualityScore.save();
        await HourlyCampaignMetric.upsert(campaign, campaign.org, action);
        await DailyParticipantMetric.upsert(participant.user, campaign, participant, action, pointValue);
        await Dragonchain.ledgerCampaignAction(action, participant.id, participant.campaign.id);
    }
    return res.redirect(campaign.target);
});
