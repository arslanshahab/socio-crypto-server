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
import { ParticipantMetricsResultModel } from "../../models/RestModels";
import { CampaignService } from "../../services/CampaignService";
import { calculateParticipantPayout, calculateTier } from "../helpers";
import { BN, formatFloat, getCryptoAssestImageUrl } from "../../util";
import { getSymbolValueInUSD } from "../../util/exchangeRate";
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
    public async getParticipant(@QueryParams() query: ListParticipantVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const participant = await this.participantService.findParticipantById(query, user);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        return new SuccessResult(participant, ParticipantModel);
    }
    @Get("/participant-posts")
    @(Returns(200, SuccessArrayResult).Of(String))
    public async getParticipantPosts(@QueryParams() query: ListParticipantVariablesModel, @Context() context: Context) {
        const results: string[] = [];
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const participant = await this.participantService.findParticipantById(query, user);
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
    public async getParticipantMetrics(
        @QueryParams() query: ListParticipantVariablesModel,
        @Context() context: Context
    ) {
        const additionalRows = [];
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const participant = await this.participantService.findParticipantById(query, user);
        if (!participant) throw new Error(PARTICIPANT_NOT_FOUND);
        const metrics = await this.dailyParticipantMetricService.getSortedByParticipantId(query.id);
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
        const { _sum } = await this.dailyParticipantMetricService.getAccumulatedParticipantMetrics(participant.id);
        const { currentTotal } = calculateTier(
            new BN(campaign.totalParticipationScore),
            (campaign.algorithm as Prisma.JsonObject).tiers as Prisma.JsonObject as unknown as Tiers
        );
        const participantShare = await calculateParticipantPayout(new BN(currentTotal), campaign, participant);
        const result = {
            clickCount: _sum?.clickCount || 0,
            likeCount: _sum?.likeCount || 0,
            shareCount: _sum?.shareCount || 0,
            viewCount: _sum?.viewCount || 0,
            submissionCount: _sum?.submissionCount || 0,
            commentCount: _sum?.commentCount || 0,
            participationScore: _sum?.participationScore || 0,
            currentTotal: parseInt(currentTotal.toString()),
            participantShare: participantShare.toNumber() || 0,
            participantShareUSD: await getSymbolValueInUSD(
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
        let counts;
        let participantShare = 0;
        if (ids.length) {
            counts = await this.dailyParticipantMetricService.getAccumulatedMetricsByParticipantIds(ids);
            for (let index = 0; index < participations.length; index++) {
                const campaign: Campaign = participations[index].campaign;
                const participant: Participant = participations[index];
                const { currentTotal } = calculateTier(
                    new BN(campaign.totalParticipationScore),
                    (campaign.algorithm as Prisma.JsonObject).tiers as Prisma.JsonObject as unknown as Tiers
                );
                const share = await calculateParticipantPayout(new BN(currentTotal), campaign, participant);
                const usdValue = await getSymbolValueInUSD(campaign.symbol, parseFloat(share.toString() || "0"));
                participantShare = participantShare + usdValue;
            }
        }
        const result = {
            clickCount: counts?._sum?.clickCount || 0,
            likeCount: counts?._sum?.likeCount || 0,
            shareCount: counts?._sum?.shareCount || 0,
            viewCount: counts?._sum?.viewCount || 0,
            submissionCount: counts?._sum?.submissionCount || 0,
            commentCount: counts?._sum?.commentCount || 0,
            totalScore: counts?._sum?.participationScore || 0,
            totalShareUSD: parseFloat(formatFloat(participantShare)) || 0,
        };
        return new SuccessResult(result, ParticipantMetricsResultModel);
    }
}
