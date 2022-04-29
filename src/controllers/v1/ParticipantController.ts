import { Get, Property, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { ParticipantModel } from ".prisma/client/entities";
import { ParticipantService } from "../../services/ParticipantService";
import { UserService } from "../../services/UserService";
import { Pagination, SuccessArrayResult, SuccessResult } from "../../util/entities";
import { CAMPAIGN_NOT_FOUND, PARTICIPANT_NOT_FOUND, USER_NOT_FOUND } from "../../util/errors";
import { DailyParticipantMetricService } from "../../services/DailyParticipantMetricService";
import { formatUTCDateForComparision, getDatesBetweenDates } from "../helpers";
import { ParticipantMetricsResultModel, ParticipantQueryParams } from "../../models/RestModels";
import { CampaignService } from "../../services/CampaignService";
import { calculateParticipantPayout, calculateTier } from "../helpers";
import { BN, formatFloat, getCryptoAssestImageUrl } from "../../util";
import { getTokenValueInUSD } from "../../util/exchangeRate";
import { Campaign, Participant, Prisma } from "@prisma/client";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { getSocialClient } from "../helpers";
import { Tiers } from "../../types";

class ListParticipantVariablesModel {
    @Property() public readonly id: string;
    @Property() public readonly campaignId: string;
    @Property() public readonly skip: number;
    @Property() public readonly take: number;
    @Property() public readonly userRelated: boolean | undefined;
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

    @Get()
    @(Returns(200, SuccessResult).Of(ParticipantModel))
    public async getParticipant(@QueryParams() query: ParticipantQueryParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const { id } = query;
        const participant = await this.participantService.findParticipantById(id, user);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        return new SuccessResult(participant, ParticipantModel);
    }
    @Get("/participant-posts")
    @(Returns(200, SuccessArrayResult).Of(String))
    public async getParticipantPosts(@QueryParams() query: ParticipantQueryParams, @Context() context: Context) {
        const results: string[] = [];
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const { id } = query;
        const participant = await this.participantService.findParticipantById(id, user);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        const posts = await this.participantService.findSocialPosts(participant.id);
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            const socialLink = await this.participantService.findSocialLinkByUserId(user?.id || "", "twitter");
            const client = getSocialClient(post.type);
            const response = await client?.getPost(socialLink, post.id);
            if (response) results.push(response);
        }
        return new SuccessArrayResult(results, String);
    }
    @Get("/participant-by-campaign-id")
    @(Returns(200, SuccessResult).Of(ParticipantModel))
    public async getParticipantByCampaignId(
        @QueryParams() query: ListParticipantVariablesModel,
        @Context() context: Context
    ) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const participant = await this.participantService.findParticipantByCampaignId(query, user);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        return new SuccessResult(participant, ParticipantModel);
    }
    @Get("/campaign-participants")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(ParticipantModel))
    public async getCampaignParticipants(
        @QueryParams() query: ListParticipantVariablesModel,
        @Context() context: Context
    ) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const [items, count] = await this.participantService.findCampaignParticipants(query);
        return new SuccessResult(new Pagination(items, count, ParticipantModel), Pagination);
    }
    @Get("/participant-metrics")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(ParticipantMetricsResultModel))
    public async getParticipantMetrics(@QueryParams() query: ParticipantQueryParams, @Context() context: Context) {
        const additionalRows = [];
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const { id } = query;
        const participant = await this.participantService.findParticipantById(id, user);
        if (!participant) throw new Error(PARTICIPANT_NOT_FOUND);
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
        return new SuccessResult(new Pagination(metricsResult, metricsResult.length, Object), Pagination);
    }
    @Get("/accumulated-participant-metrics")
    @(Returns(200, SuccessResult).Of(ParticipantMetricsResultModel))
    public async getAccumulatedParticipantMetrics(
        @QueryParams() query: ListParticipantVariablesModel,
        @Context() context: Context
    ) {
        const { campaignId } = query;
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const campaign: Campaign | null = await this.campaignService.findCampaignById(campaignId);
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        const participant: Participant | null = await this.participantService.findParticipantByCampaignId(query, user);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        const participantMetrics = await this.dailyParticipantMetricService.getAccumulatedParticipantMetrics(
            participant.id
        );
        // const clickCount = participantMetrics.reduce((acc, curr) => acc + parseInt(curr.clickCount), 0);
        // const likeCount = participantMetrics.reduce((acc, curr) => acc + parseInt(curr.likeCount), 0);
        // const shareCount = participantMetrics.reduce((acc, curr) => acc + parseInt(curr.shareCount), 0);
        // const viewCount = participantMetrics.reduce((acc, curr) => acc + parseInt(curr.viewCount), 0);
        // const submissionCount = participantMetrics.reduce((acc, curr) => acc + parseInt(curr.submissionCount), 0);
        // const commentCount = participantMetrics.reduce((acc, curr) => acc + parseInt(curr.commentCount), 0);
        // const participationScore = participantMetrics.reduce((acc, curr) => acc + parseInt(curr.participationScore), 0);
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
        return new SuccessResult(result, ParticipantMetricsResultModel);
    }
    @Get("/accumulated-user-metrics")
    @(Returns(200, SuccessResult).Of(ParticipantMetricsResultModel))
    public async getAccumulatedUserMetrics(
        @QueryParams() query: ListParticipantVariablesModel,
        @Context() context: Context
    ) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const participations = await this.participantService.findParticipantByUser(user.id);
        const ids = participations.map((p) => p.id);
        let dailyParticipantMetrics;
        let participantShare = 0;
        if (ids.length) {
            dailyParticipantMetrics = await this.dailyParticipantMetricService.getAccumulatedMetricsByParticipantIds(
                ids
            );
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
        if (!dailyParticipantMetrics) throw new NotFound("Daily participant metrics not found");
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
        return new SuccessResult(result, ParticipantMetricsResultModel);
    }
}
