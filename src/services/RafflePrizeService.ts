import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { Campaign, RafflePrize } from "@prisma/client";

@Injectable()
export class RafflePrizeService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves a user object from a JWTPayload
     *
     * @param data the jwt payload
     * @param include additional relations to include with the user query
     * @returns the user object, with the requested relations included
     */
    public async createRafflePrize(campaign: Campaign, prize: RafflePrize) {
        const response = await this.prismaService.rafflePrize.create({
            data: {
                campaignId: campaign.id,
                displayName: prize.displayName,
                affiliateLink: prize.affiliateLink,
                image: prize.image,
            },
        });
        return response;
    }

    public async findRafflePrizeByCampaignId(campaignId: string) {
        return await this.prismaService.rafflePrize.findMany({
            where: { campaignId },
        });
    }

    public async deleteRafflePrize(campaignId: string) {
        return await this.prismaService.rafflePrize.deleteMany({
            where: { campaignId },
        });
    }
}
