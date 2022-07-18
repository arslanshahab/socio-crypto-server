import { Context, Middleware, Req, Res } from "@tsed/common";
import { Inject } from "@tsed/di";
import { DragonchainService } from "../services/DragonchainService";
import { ParticipantAction } from "../util/constants";
import { limit } from "../util/rateLimiter";
import { prisma, readPrisma } from "../clients/prisma";
import { calculateQualityTierMultiplier, BN } from "../util/index";
import { Prisma } from "@prisma/client";
import { PointValueTypes } from "../types.d";

const { RATE_LIMIT_MAX = "3" } = process.env;

/**
 * Authenticates users based on the Authorization header
 */
@Middleware()
export class ParticipantClickTracking {
    @Inject()
    private dragonchainService: DragonchainService;

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
            let qualityScore = await readPrisma.qualityScore.findFirst({ where: { participantId: participant.id } });
            if (!qualityScore) qualityScore = QualityScore.newQualityScore(participant.id);
            const multiplier = calculateQualityTierMultiplier(new BN(qualityScore?.clicks || 0));
            participant.clickCount = new BN(participant.clickCount).plus(new BN(1)).toString();
            const pointValues = (campaign.algorithm as Prisma.JsonObject).pointValues as unknown as PointValueTypes;
            const pointValue = new BN(pointValues[action]).times(multiplier);
            const campaignTotalParticipationScore = new BN(campaign.totalParticipationScore)
                .plus(pointValue)
                .toString();
            participant.participationScore = new BN(participant.participationScore).plus(pointValue).toString();
            await prisma.campaign.update({
                where: { id: campaign.id },
                data: { totalParticipationScore: campaignTotalParticipationScore },
            });
            await participant.save();
            await qualityScore.save();
            await HourlyCampaignMetric.upsert(campaign, campaign.org, action);
            await DailyParticipantMetric.upsert(participant.user, campaign, participant, action, pointValue);
            await this.dragonchainService.ledgerCampaignAction({
                action,
                participantId: participant.id,
                campaignId: participant.campaign.id,
            });
        }
        return res.redirect(campaign.target.includes("https") ? campaign.target : `https://${campaign.target}`);
    }
}
