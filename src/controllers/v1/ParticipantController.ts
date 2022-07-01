import { Get, Property, Put, Required, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { BodyParams, Context, PathParams, QueryParams } from "@tsed/common";
import { ParticipantModel } from ".prisma/client/entities";
import { ParticipantService } from "../../services/ParticipantService";
import { UserService } from "../../services/UserService";
import { Pagination, SuccessArrayResult, SuccessResult } from "../../util/entities";
import { CAMPAIGN_NOT_FOUND, PARTICIPANT_NOT_FOUND, USER_NOT_FOUND } from "../../util/errors";
import { DailyParticipantMetricService } from "../../services/DailyParticipantMetricService";
import { formatUTCDateForComparision, getDatesBetweenDates } from "../helpers";
import {
    AccumulatedParticipantMetricsResultModel,
    AccumulatedUserMetricsResultModel,
    BooleanResultModel,
    CampaignIdModel,
    CampaignParticipantResultModel,
    CampaignResultModel,
    ParticipantMetricsResultModel,
    ParticipantQueryParams,
    ParticipantResultModelV2,
    UserResultModel,
} from "../../models/RestModels";
import { CampaignService } from "../../services/CampaignService";
import { calculateParticipantPayout, calculateTier } from "../helpers";
import { BN, formatFloat, getCryptoAssestImageUrl } from "../../util";
import { getTokenValueInUSD } from "../../util/exchangeRate";
import { Campaign, Participant, Prisma } from "@prisma/client";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { getSocialClient } from "../helpers";
import { Tiers } from "../../types";
import { SocialLinkService } from "../../services/SocialLinkService";
import { MarketDataService } from "../../services/MarketDataService";

class CampaignParticipantsParams {
    @Property() public readonly campaignId: string;
    @Property() public readonly skip: number;
    @Property() public readonly take: number;
    @Property() public readonly nonZeroScore: boolean;
}

class ParticipantIdParams {
    @Property() public readonly id: string;
}

class CampaignAllParticipantsParams {
    @Required() public readonly campaignId: string;
    @Required() public readonly skip: number;
    @Required() public readonly take: number;
    @Property() public readonly filter: string;
}

@Controller("/participant")
export class ParticipantController {
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private dailyParticipantMetricService: DailyParticipantMetricService;
    @Inject()
    private campaignService: CampaignService;
    @Inject()
    private userService: UserService;
    @Inject()
    private socialLinkService: SocialLinkService;
    @Inject()
    private marketDataService: MarketDataService;

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
        const posts = await this.participantService.findSocialPosts(participant.id);
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            const socialLink = await this.socialLinkService.findSocialLinkByUserId(user.id, "twitter");
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
        const participantMetrics = await this.dailyParticipantMetricService.getDailyParticipantById(participant.id);
        const { clickCount, likeCount, shareCount, viewCount, submissionCount, commentCount, participationScore } =
            participantMetrics.reduce(
                (acc, curr) => {
                    acc.clickCount += parseInt(curr.clickCount);
                    acc.likeCount += parseInt(curr.likeCount);
                    acc.shareCount += parseInt(curr.shareCount);
                    acc.viewCount += parseInt(curr.viewCount);
                    acc.submissionCount += parseInt(curr.submissionCount);
                    acc.commentCount += parseInt(curr.commentCount);
                    acc.participationScore += parseInt(curr.participationScore);
                    return acc;
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
        const participations = await this.participantService.findParticipantsByUserId(user.id);
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

    @Get("/campaign-all-participants")
    @(Returns(200, SuccessArrayResult).Of(Object))
    public async getParticipants(@BodyParams() body: CampaignAllParticipantsParams, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { campaignId, skip, take, filter } = body;
        const [items, count] = await this.participantService.findParticipantsByCampaignId({
            campaignId: campaignId,
            skip: skip,
            take: take,
            filter: filter,
        });
        return new SuccessResult({ items, count }, Object);
    }
}
