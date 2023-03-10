import { Enum, Get, Post, Property, Put, Required, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { BodyParams, Context, PathParams, QueryParams, Request } from "@tsed/common";
import { Request as ExpressRequest } from "express";
import { ParticipantModel } from ".prisma/client/entities";
import { ParticipantService } from "../../services/ParticipantService";
import { UserService } from "../../services/UserService";
import { Pagination, SuccessArrayResult, SuccessResult } from "../../util/entities";
import {
    CAMPAIGN_CLOSED,
    CAMPAIGN_NOT_FOUND,
    MISSING_PARAMS,
    PARTICIPANT_NOT_FOUND,
    USER_NOT_FOUND,
} from "../../util/errors";
import { DailyParticipantMetricService } from "../../services/DailyParticipantMetricService";
import { formatUTCDateForComparision, getDatesBetweenDates } from "../helpers";
import {
    AccumulatedParticipantMetricsResultModel,
    AccumulatedUserMetricsResultModel,
    BooleanResultModel,
    CampaignDetailsResultModel,
    CampaignIdModel,
    CampaignParticipantResultModel,
    CampaignResultModel,
    ParticipantMetricsResultModel,
    ParticipantQueryParams,
    ParticipantResultModelV2,
    UserResultModel,
    UserStatisticsResultModel,
} from "../../models/RestModels";
import { CampaignService } from "../../services/CampaignService";
import { calculateParticipantPayout, calculateTier } from "../helpers";
import { BN, calculateQualityTierMultiplier, formatFloat, getCryptoAssestImageUrl } from "../../util";
import { getTokenValueInUSD } from "../../util/exchangeRate";
import { Campaign, Participant, Prisma } from "@prisma/client";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { getSocialClient } from "../helpers";
import { PointValueTypes, Tiers } from "types.d.ts";
import { SocialLinkService } from "../../services/SocialLinkService";
import { MarketDataService } from "../../services/MarketDataService";
import {
    ADMIN,
    FEE_RATE,
    MANAGER,
    ParticipantAction,
    SocialClientType,
    SocialLinkType,
    Sort,
} from "../../util/constants";
import { SocialPostService } from "../../services/SocialPostService";
import { limit } from "../../util/rateLimiter";
import { QualityScoreService } from "../../services/QualityScoreService";
import { HourlyCampaignMetricsService } from "../../services/HourlyCampaignMetricsService";
import { OrganizationService } from "../../services/OrganizationService";
import { DragonChainService } from "../../services/DragonChainService";
import { prisma } from "../../clients/prisma";
import { AdminService } from "../../services/AdminService";
import { subMonths } from "date-fns";
import { CoiinChainService } from "../../services/CoiinChainService";

class CampaignParticipantsParams {
    @Property() public readonly campaignId: string;
    @Required() public readonly skip: number;
    @Required() public readonly take: number;
}

class ParticipantIdParams {
    @Property() public readonly id: string;
}

class CampaignAllParticipantsParams {
    @Required() public readonly campaignId: string;
    @Required() public readonly skip: number;
    @Required() public readonly take: number;
    @Property() public readonly filter: string;
    @Property() @Enum(Sort) public readonly sort: Sort;
}

class UserStatisticsParams {
    @Required() public readonly userId: string;
}

class ParticipantTrackingBodyParams {
    @Required() public readonly participantId: string;
    @Required() @Enum(ParticipantAction) public readonly action: ParticipantAction;
}

class UserDemographicParams {
    @Required() public readonly campaignId: string;
    @Property() public readonly startDate: string;
    @Property() public readonly endDate: string;
    @Property() public readonly month: number;
}

const { RATE_LIMIT_MAX = "3" } = process.env;

@Controller("/participant")
export class ParticipantController {
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private dailyParticipantMetricService: DailyParticipantMetricService;
    @Inject()
    hourlyCampaignMetricService: HourlyCampaignMetricsService;
    @Inject()
    private campaignService: CampaignService;
    @Inject()
    private userService: UserService;
    @Inject()
    private socialLinkService: SocialLinkService;
    @Inject()
    private marketDataService: MarketDataService;
    @Inject()
    socialPostService: SocialPostService;
    @Inject()
    qualityScoreService: QualityScoreService;
    @Inject()
    organizationService: OrganizationService;
    @Inject()
    private dragonChainService: DragonChainService;
    @Inject()
    private adminService: AdminService;
    @Inject()
    private coiinChainService: CoiinChainService;

    @Get()
    @(Returns(200, SuccessResult).Of(ParticipantResultModelV2))
    public async getParticipant(@QueryParams() query: ParticipantIdParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const { id } = query;
        const participant = await this.participantService.findParticipantById(id, {
            campaign: true,
            user: { include: { profile: true } },
        });
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        return new SuccessResult(ParticipantResultModelV2.build(participant), ParticipantResultModelV2);
    }

    @Get("/participant-posts")
    @(Returns(200, SuccessArrayResult).Of(String))
    public async getParticipantPosts(@QueryParams() query: ParticipantIdParams, @Context() context: Context) {
        const results: string[] = [];
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const { id } = query;
        const participant = await this.participantService.findParticipantById(id);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        const posts = await this.socialPostService.findSocialPostByParticipantId(participant.id);
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            const socialLink = await this.socialLinkService.findSocialLinkByUserAndType(
                user.id,
                SocialLinkType.TWITTER
            );
            const client = getSocialClient(post.type);
            const response = await client?.getPost(socialLink, post.id);
            if (response) results.push(response);
        }
        return new SuccessArrayResult(results, String);
    }

    @Get("/participant-by-campaign-id")
    @(Returns(200, SuccessResult).Of(ParticipantResultModelV2))
    public async getParticipantByCampaignId(@QueryParams() query: CampaignIdModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const { campaignId } = query;
        const participant = await this.participantService.findParticipantByCampaignId(campaignId, user.id, {
            campaign: true,
            user: { include: { profile: true } },
        });
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        return new SuccessResult(ParticipantResultModelV2.build(participant), ParticipantResultModelV2);
    }

    @Get("/campaign-participants")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(ParticipantModel))
    public async getCampaignParticipants(
        @QueryParams() query: CampaignParticipantsParams,
        @Context() context: Context
    ) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const [items, count] = await this.participantService.findCampaignParticipants(query);
        const data = await Promise.all(
            items.map(async (item) => {
                const campaignTokenValueInUSD = await this.marketDataService.getTokenValueInUSD(
                    item.campaign.currency?.token?.symbol || "",
                    parseFloat(item.campaign.coiinTotal)
                );
                const augmentedCampaign = await CampaignResultModel.build(item.campaign, campaignTokenValueInUSD);
                const augmentedUser = await UserResultModel.build(item.user);
                return {
                    ...item,
                    campaign: {
                        ...item.campaign,
                        ...augmentedCampaign,
                    },
                    user: {
                        ...item.user,
                        ...augmentedUser,
                    },
                };
            })
        );
        return new SuccessResult(new Pagination(data, count, CampaignParticipantResultModel), Pagination);
    }

    @Get("/participant-metrics")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(ParticipantMetricsResultModel))
    public async getParticipantMetrics(@QueryParams() query: ParticipantQueryParams, @Context() context: Context) {
        const additionalRows = [];
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const { id } = query;
        const participant = await this.participantService.findParticipantById(id, { campaign: true });
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        const metrics = await this.dailyParticipantMetricService.getSortedByParticipantId(id);
        if (
            metrics.length > 0 &&
            formatUTCDateForComparision(metrics[metrics.length - 1].createdAt) !==
                formatUTCDateForComparision(new Date())
        ) {
            const datesInBetween = getDatesBetweenDates(new Date(metrics[metrics.length - 1].createdAt), new Date());
            for (let i = 0; i < datesInBetween.length; i++) {
                const response = await this.dailyParticipantMetricService.createPlaceholderRow(
                    datesInBetween[i],
                    metrics[metrics.length - 1].totalParticipationScore,
                    participant.campaign,
                    user,
                    participant
                );
                additionalRows.push(response);
            }
        }
        const metricsResult = metrics.concat(additionalRows);
        return new SuccessResult(
            new Pagination(metricsResult, metricsResult.length, ParticipantMetricsResultModel),
            Pagination
        );
    }

    @Get("/accumulated-participant-metrics")
    @(Returns(200, SuccessResult).Of(AccumulatedParticipantMetricsResultModel))
    public async getAccumulatedParticipantMetrics(@QueryParams() query: CampaignIdModel, @Context() context: Context) {
        const { campaignId } = query;
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const campaign: Campaign | null = await this.campaignService.findCampaignById(campaignId);
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        const participant: Participant | null = await this.participantService.findParticipantByCampaignId(
            campaignId,
            user.id
        );
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        const { clickCount, likeCount, shareCount, viewCount, submissionCount, commentCount, participationScore } =
            await this.dailyParticipantMetricService.getAccumulatedParticipantMetrics(participant.id);
        const { currentTotal } = calculateTier(
            new BN(campaign.totalParticipationScore),
            (campaign.algorithm as Prisma.JsonObject).tiers as Prisma.JsonObject as unknown as Tiers
        );
        const participantShare = await calculateParticipantPayout(new BN(currentTotal), campaign, participant);
        const result = {
            clickCount: clickCount || 0,
            likeCount: likeCount || 0,
            shareCount: shareCount || 0,
            viewCount: viewCount || 0,
            submissionCount: submissionCount || 0,
            commentCount: commentCount || 0,
            participationScore: participationScore || 0,
            currentTotal: parseInt(currentTotal.toString()) || 0,
            participantShare: participantShare.toNumber() || 0,
            participantShareUSD: await getTokenValueInUSD(
                campaign.symbol,
                parseFloat(participantShare.toString() || "0")
            ),
            symbol: campaign.symbol,
            symbolImageUrl: getCryptoAssestImageUrl(campaign.symbol),
            campaignId: campaign.id,
            participantId: participant.id,
        };
        return new SuccessResult(result, AccumulatedParticipantMetricsResultModel);
    }

    @Get("/accumulated-user-metrics")
    @(Returns(200, SuccessResult).Of(AccumulatedUserMetricsResultModel))
    public async getAccumulatedUserMetrics(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const participations = await this.participantService.findParticipantsByUserId(user.id, { campaign: true });
        const ids = participations.map((p) => p.id);
        const dailyParticipantMetrics = await this.dailyParticipantMetricService.getDailyParticipantByIds(ids);
        let participantShare = 0;
        if (ids.length) {
            for (let index = 0; index < participations.length; index++) {
                const campaign: Campaign = participations[index].campaign;
                const participant: Participant = participations[index];
                const { currentTotal } = calculateTier(
                    new BN(campaign.totalParticipationScore),
                    (campaign.algorithm as Prisma.JsonObject).tiers as Prisma.JsonObject as unknown as Tiers
                );
                const share = await calculateParticipantPayout(new BN(currentTotal), campaign, participant);
                const usdValue = await getTokenValueInUSD(campaign.symbol, parseFloat(share.toString() || "0"));
                participantShare = participantShare + usdValue;
            }
        }
        const { clickCount, likeCount, shareCount, viewCount, submissionCount, commentCount, participationScore } =
            dailyParticipantMetrics.reduce(
                (sum, curr) => {
                    sum.clickCount += parseInt(curr.clickCount);
                    sum.likeCount += parseInt(curr.likeCount);
                    sum.shareCount += parseInt(curr.shareCount);
                    sum.viewCount += parseInt(curr.viewCount);
                    sum.submissionCount += parseInt(curr.submissionCount);
                    sum.commentCount += parseInt(curr.commentCount);
                    sum.participationScore += parseInt(curr.participationScore);
                    return sum;
                },
                {
                    clickCount: 0,
                    likeCount: 0,
                    shareCount: 0,
                    viewCount: 0,
                    submissionCount: 0,
                    commentCount: 0,
                    participationScore: 0,
                }
            );

        const result = {
            clickCount: clickCount || 0,
            likeCount: likeCount || 0,
            shareCount: shareCount || 0,
            viewCount: viewCount || 0,
            submissionCount: submissionCount || 0,
            commentCount: commentCount || 0,
            totalScore: participationScore || 0,
            totalShareUSD: parseFloat(formatFloat(participantShare)) || 0,
        };
        return new SuccessResult(result, AccumulatedUserMetricsResultModel);
    }

    @Put("/blacklist/:id")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async blacklistParticipant(@PathParams() path: ParticipantIdParams, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { id } = path;
        const participant = await this.participantService.findParticipantById(id);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        await this.participantService.blacklistParticipant({
            participantId: participant.id,
            userId: participant.userId,
            campaignId: participant.campaignId,
        });
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    //For admin-panel
    @Get("/all")
    @(Returns(200, SuccessArrayResult).Of(CampaignDetailsResultModel))
    public async getParticipants(@QueryParams() query: CampaignAllParticipantsParams, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { campaignId, skip, take, filter, sort = Sort.DESC } = query;
        const campaign = await this.campaignService.findCampaignById(campaignId, {
            currency: { include: { token: true } },
        });
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        const allParticipants = await this.participantService.findParticipantsByCampaignId(
            campaignId,
            skip,
            take,
            filter,
            sort
        );
        const { currentTotal } = calculateTier(
            new BN(campaign.totalParticipationScore),
            (campaign.algorithm as Prisma.JsonObject).tiers as Prisma.JsonObject as unknown as Tiers
        );
        let totalRewardAmount = new BN(currentTotal);
        const campaignFee = totalRewardAmount.multipliedBy(FEE_RATE);
        totalRewardAmount = totalRewardAmount.minus(campaignFee);
        const participants = [];
        for (const participant of allParticipants) {
            const metrics = await this.dailyParticipantMetricService.getAccumulatedParticipantMetrics(participant.id);
            const postCount = await this.socialPostService.getSocialPostCount(participant.id, campaignId);
            const pointValues = (participant.algorithm as Prisma.JsonObject).pointValues as unknown as PointValueTypes;
            const socialLink = await this.socialLinkService.findSocialLinkByUserAndType(
                participant.userId,
                SocialClientType.TWITTER
            );
            const participantShare = await calculateParticipantPayout(totalRewardAmount, campaign, participant);
            participants.push({
                id: participant.id,
                userId: participant.userId,
                username: participant.username || "",
                email: participant.email,
                campaignName: participant.campaignName,
                selfPostCount: postCount,
                likeScore: metrics.likeCount * pointValues.likes,
                shareScore: metrics.shareCount * pointValues.shares,
                totalLikes: metrics.likeCount || 0,
                totalShares: metrics.shareCount || 0,
                participationScore: participant.participationScore || 0,
                blacklist: participant.blacklist,
                twitterUsername: socialLink.username,
                participantShare: formatFloat(participantShare.toString()),
                participantShareUSD: formatFloat(
                    await getTokenValueInUSD(
                        campaign.currency?.token?.symbol || "",
                        parseFloat(participantShare.toString() || "0")
                    )
                ),
            });
        }
        const count = await this.participantService.findParticipantCountByCampaignId(campaignId, filter);
        return new SuccessResult({ participants, count, campaignSymbol: campaign.symbol }, CampaignDetailsResultModel);
    }

    // For admin-panel
    @Get("/statistics")
    @(Returns(200, SuccessArrayResult).Of(UserStatisticsResultModel))
    public async userStatistics(@QueryParams() query: UserStatisticsParams, @Context() context: Context) {
        const { userId } = query;
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const participants = await this.participantService.findParticipantsByUserId(userId, { campaign: true });
        const statistics = [];
        for (const participant of participants) {
            if (participant) {
                const participantMetrics = await this.dailyParticipantMetricService.getAccumulatedParticipantMetrics(
                    participant.id
                );
                statistics.push({
                    ...participantMetrics,
                    campaignName: participant.campaign.name,
                    campaignId: participant.campaign.id,
                    participationDate: participant.createdAt,
                });
            }
        }
        return new SuccessArrayResult(statistics, UserStatisticsResultModel);
    }

    @Post("/track-action")
    public async trackAction(@Request() req: ExpressRequest, @BodyParams() body: ParticipantTrackingBodyParams) {
        const { action, participantId } = body;
        const ipAddress = req.connection.remoteAddress || req.socket.remoteAddress;
        const shouldRateLimit = await limit(
            `${ipAddress}-${participantId}-${action}`,
            Number(RATE_LIMIT_MAX),
            "minute"
        );
        if (!["views", "submissions"].includes(action)) throw new BadRequest(MISSING_PARAMS);
        const participant = await this.participantService.findParticipantById(participantId);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        const campaign = await this.campaignService.findCampaignById(participant.campaignId);
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        const user = await this.userService.findUserById(participant.userId);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        if (!this.campaignService.isCampaignOpen(campaign)) throw new NotFound(CAMPAIGN_CLOSED);
        if (!shouldRateLimit) {
            let qualityScore = await this.qualityScoreService.findByParticipantOrCreate(participant.id);
            let multiplier, newViewCount, newSubmissionCount;
            switch (action) {
                case "views":
                    newViewCount = new BN(participant.viewCount).plus(new BN(1)).toString();
                    multiplier = calculateQualityTierMultiplier(new BN(qualityScore.views));
                    break;
                case "submissions":
                    newSubmissionCount = new BN(participant.submissionCount).plus(new BN(1)).toString();
                    multiplier = calculateQualityTierMultiplier(new BN(qualityScore.submissions));
                    break;
                default:
                    throw new Error("Action not supported");
            }
            const campaignPointValues = (campaign.algorithm as Prisma.JsonObject)
                .pointValues as unknown as PointValueTypes;
            const pointValue = new BN(campaignPointValues[action]).times(multiplier);
            const newTotalParticipationScore = new BN(campaign.totalParticipationScore).plus(pointValue).toString();
            const newParticipationScore = new BN(participant.participationScore).plus(pointValue).toString();
            await prisma.campaign.update({
                where: { id: campaign.id },
                data: { totalParticipationScore: newTotalParticipationScore },
            });
            await prisma.participant.update({
                where: { id_campaignId_userId: { id: participant.id, userId: user.id, campaignId: campaign.id } },
                data: {
                    participationScore: newParticipationScore,
                    viewCount: newViewCount || "0",
                    submissionCount: newSubmissionCount || "0",
                },
            });
            await this.hourlyCampaignMetricService.upsertMetrics(campaign.id, campaign.orgId!, action);
            await this.dailyParticipantMetricService.upsertMetrics({
                user,
                campaign,
                participant,
                action,
                additiveParticipationScore: pointValue,
            });
            await this.dragonChainService.ledgerCampaignAction({
                action,
                participantId: participant.id,
                campaignId: campaign.id,
            });
            await this.coiinChainService.ledgerCampaignAction({
                userId: user.id,
                action,
                participantId: participant.id,
                campaignId: campaign.id,
            });
        }
        return participant.id;
    }

    @Get("/demographic")
    @(Returns(200, SuccessResult).Of(Object))
    public async participantsDemographics(@QueryParams() query: UserDemographicParams, @Context() context: Context) {
        let { campaignId, startDate, endDate, month } = query;
        const { orgId } = await this.adminService.checkPermissions({ hasRole: [ADMIN, MANAGER] }, context.get("user"));
        const filterByMonth = subMonths(new Date(), month);
        let participants;
        let count = 0;
        const campaignCount = await this.campaignService.getCampaignsCount(orgId!);
        if (campaignCount && campaignId === "-1") {
            const campaign = await this.campaignService.getLastCampaign(orgId || "");
            if (!startDate && campaign) startDate = month ? filterByMonth.toString() : campaign.createdAt.toString();
            if (!endDate) endDate = new Date().toString();
            const campaigns = await this.campaignService.findCampaigns(orgId);
            const campaignIds = await campaigns.map((campaign) => campaign.id);
            [participants, count] = await this.participantService.findParticipantsForOrg({
                campaignIds,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            });
        }
        if (campaignId && campaignId !== "-1") {
            const campaign = await this.campaignService.findCampaignById(campaignId);
            if (!startDate && campaign) startDate = month ? filterByMonth.toString() : campaign.createdAt.toString();
            if (!endDate) endDate = new Date().toString();
            [participants, count] = await this.participantService.findParticipantsForOrg({
                campaignId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            });
        }
        return new SuccessResult({ participants, count }, Object);
    }
}
