import { Context, Middleware, Req, Res } from "@tsed/common";
import { Inject } from "@tsed/di";
import { ParticipantAction } from "../util/constants";
import { limit } from "../util/rateLimiter";
import { prisma, readPrisma } from "../clients/prisma";
import { calculateQualityTierMultiplier, BN } from "../util/index";
import { Prisma } from "@prisma/client";
import { PointValueTypes } from "../types.d";
import { QualityScoreService } from "../services/QualityScoreService";
import { HourlyCampaignMetricsService } from "../services/HourlyCampaignMetricsService";
import { DailyParticipantMetricService } from "../services/DailyParticipantMetricService";
import { DragonChainService } from "../services/DragonChainService";

const { RATE_LIMIT_MAX = "3" } = process.env;

/**
 * Authenticates users based on the Authorization header
 */
@Middleware()
export class ParticipantClickTracking {
    @Inject()
    private dragonChainService: DragonChainService;
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
            participant = await prisma.participant.findFirst({ where: { id: participantId } });
        } catch (error) {
            return res.status(404).json({ code: "NOT_FOUND", message: "participant not found" });
        }
        if (!participant) return res.status(404).json({ code: "NOT_FOUND", message: "participant not found" });
        let user = await prisma.user.findFirst({ where: { id: participant.userId } });
        if (!user) return res.status(404).json({ code: "NOT_FOUND", message: "user not found" });
        let campaign = await prisma.campaign.findFirst({ where: { id: participant.campaignId } });
        if (!campaign) return res.status(404).json({ code: "NOT_FOUND", message: "campaign not found" });
        const campaignOrg = await readPrisma.org.findFirst({ where: { id: campaign.orgId! } });
        if (!campaignOrg) return res.status(404).json({ code: "NOT_FOUND", message: "org not found" });
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
            campaign = await prisma.campaign.update({
                where: { id: campaign.id },
                data: { totalParticipationScore: campaignTotalParticipationScore },
            });
            participant = await prisma.participant.update({
                where: {
                    id_campaignId_userId: { id: participant.id, campaignId: campaign.id, userId: user.id },
                },
                data: { participationScore: participationScore, clickCount },
            });
            await this.hourlyCampaignMetricService.upsertMetrics(campaign.id, campaignOrg.id!, action);
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
                campaignId: participant.campaignId,
            });
        }
        return res.redirect(campaign.target.includes("https") ? campaign.target : `https://${campaign.target}`);
    }
}
