import { calculateParticipantPayout, calculateTier } from "../../src/controllers/helpers";
import { formatFloat } from "../../src/util";
import { FEE_RATE } from "../../src/util/constants";
import { getTokenValueInUSD } from "../../src/util/exchangeRate";
import { prisma } from "../../src/clients/prisma";
import { BN } from "../../src/util/index";
import { Prisma } from "@prisma/client";
import { Tiers } from "../../types";

(async () => {
    try {
        const campaignId = "5ba1a41c-11f1-45a5-b73a-a50d20c6a0d1";
        const username = "Yhant370";
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: username }, { profile: { username: { contains: username, mode: "insensitive" } } }],
            },
            include: { profile: true },
        });
        if (!user) throw new Error("user not found");
        const campaign = await prisma.campaign.findFirst({
            where: { id: campaignId },
            include: {
                currency: { include: { token: true } },
            },
        });
        if (!campaign) throw new Error("campaign not found");
        const participant = await prisma.participant.findFirst({
            where: { userId: user?.id, campaignId: campaign.id },
        });
        if (!participant) throw new Error("participant not found");
        const { currentTotal } = calculateTier(
            new BN(campaign.totalParticipationScore),
            (campaign.algorithm as Prisma.JsonObject).tiers as Prisma.JsonObject as unknown as Tiers
        );
        let totalRewardAmount = new BN(currentTotal);
        const campaignFee = totalRewardAmount.multipliedBy(FEE_RATE);
        totalRewardAmount = totalRewardAmount.minus(campaignFee);
        const participantShare = await calculateParticipantPayout(totalRewardAmount, campaign, participant);
        console.log({
            id: participant?.id,
            userId: participant.userId,
            username: user.profile?.username,
            email: user.email,
            campaignName: campaign.name,
            participationScore: participant.participationScore || 0,
            blacklist: participant.blacklist,
            participantShare: formatFloat(participantShare.toString()),
            participantShareUSD: formatFloat(
                await getTokenValueInUSD(
                    campaign.currency?.token?.symbol || "",
                    parseFloat(participantShare.toString() || "0")
                )
            ),
        });
    } catch (error) {
        throw new Error(error.message);
    }
})();
