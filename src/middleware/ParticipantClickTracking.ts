import { Context, Middleware, Req, Res } from "@tsed/common";
import { Inject } from "@tsed/di";
import { ParticipantAction } from "../util/constants";
import { limit } from "../util/rateLimiter";
import { prisma } from "../clients/prisma";
import { calculateQualityTierMultiplier, BN } from "../util/index";
import { Prisma } from "@prisma/client";
import { PointValueTypes } from "../types.d";
import { QualityScoreService } from "../services/QualityScoreService";
import { HourlyCampaignMetricsService } from "../services/HourlyCampaignMetricsService";
import { DailyParticipantMetricService } from "../services/DailyParticipantMetricService";
import { DragonchainService } from "../services/DragonchainService";

const { RATE_LIMIT_MAX = "3" } = process.env;

/**
 * Authenticates users based on the Authorization header
 */
@Middleware()
export class ParticipantClickTracking {
    @Inject()
    private dragonchainService: DragonchainService;
    @Inject()
    private qualityScoreService: QualityScoreService;
    @Inject()
    private hourlyCampaignMetricService: HourlyCampaignMetricsService;
    @Inject()
    private dailyParticipantMetricService: DailyParticipantMetricService;

    public async use(@Req() req: Req, @Res() res: Res, @Context() ctx: Context) {
        const { participantId } = req.params;
        const action = ParticipantAction.CLICKS;
        const ipAddress = req.connection.remoteAddress || req.socket.remoteAddress;
        const shouldRateLimit = await limit(`${ipAddress}-${participantId}-click`, Number(RATE_LIMIT_MAX), "minute");
        if (!participantId)
            return res.status(400).json({ code: "MALFORMED_INPUT", message: "missing participant ID in request" });
        let participant;
        try {
            participant = await prisma.participant.findFirst({
                where: { id: participantId },
                include: { campaign: true, user: true },
            });
        } catch (error) {
            return res.status(404).json({ code: "NOT_FOUND", message: "participant not found" });
        }
        if (!participant) return res.status(404).json({ code: "NOT_FOUND", message: "participant not found" });
        const campaign = await prisma.campaign.findFirst({
            where: { id: participant.campaign.id },
            include: { org: true },
        });
        if (!campaign) return res.status(404).json({ code: "NOT_FOUND", message: "campaign not found" });
        if (!shouldRateLimit) {
            let qualityScore = await this.qualityScoreService.findByParticipantOrCreate(participant.id);
            const multiplier = calculateQualityTierMultiplier(new BN(qualityScore?.clicks || 0));
            const clickCount = new BN(participant.clickCount).plus(new BN(1)).toString();
            const pointValues = (campaign.algorithm as Prisma.JsonObject).pointValues as unknown as PointValueTypes;
            const pointValue = new BN(pointValues[action]).times(multiplier);
            const campaignTotalParticipationScore = new BN(campaign.totalParticipationScore)
                .plus(pointValue)
                .toString();
            const participationScore = new BN(participant.participationScore).plus(pointValue).toString();
            await prisma.campaign.update({
                where: { id: campaign.id },
                data: { totalParticipationScore: campaignTotalParticipationScore },
            });
            await prisma.participant.update({
                where: {
                    id_campaignId_userId: { id: participant.id, campaignId: campaign.id, userId: participant.user.id },
                },
                data: { participationScore: participationScore, clickCount },
            });
            await this.hourlyCampaignMetricService.upsertMetrics(campaign.id, campaign.org?.id!, action);
            await this.dailyParticipantMetricService.upsertMetrics({
                user: participant.user,
                campaign,
                participant,
                action,
                additiveParticipationScore: pointValue,
            });
            await this.dragonchainService.ledgerCampaignAction({
                action,
                participantId: participant.id,
                campaignId: participant.campaign.id,
            });
        }
        return res.redirect(campaign.target.includes("https") ? campaign.target : `https://${campaign.target}`);
    }
}
