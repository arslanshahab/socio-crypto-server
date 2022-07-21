import { Injectable } from "@tsed/di";
import { Campaign, RafflePrize } from "@prisma/client";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class RafflePrizeService {
    public async createRafflePrize(campaign: Campaign, prize: RafflePrize) {
        return await prisma.rafflePrize.create({
            data: {
                campaignId: campaign.id,
                displayName: prize.displayName,
                affiliateLink: prize.affiliateLink && prize.affiliateLink,
                image: prize.image && prize.image,
            },
        });
    }

    public async findRafflePrizeByCampaignId(campaignId: string) {
        return await readPrisma.rafflePrize.findMany({
            where: { campaignId },
        });
    }

    public async deleteRafflePrize(campaignId: string) {
        return await prisma.rafflePrize.deleteMany({
            where: { campaignId },
        });
    }
}
