import { Prisma, User } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { ListCampaignsVariablesV2 } from "../types";

@Injectable()
export class CampaignService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves a paginated list of campaigns
     *
     * @param params the search parameters for the campaigns
     * @param user an optional user include in the campaign results (depends on params.userRelated)
     * @returns the list of campaigns, and a count of total campaigns, matching the parameters
     */
    public async findCampaignsByStatus(params: ListCampaignsVariablesV2, user?: User) {
        const now = new Date();

        const where: Prisma.CampaignWhereInput = {
            ...(params.state === "OPEN" ? { endDate: { gte: now } } : {}),
            ...(params.state === "CLOSED" ? { endDate: { lte: now } } : {}),
            status: params.status || "APPROVED",
            isGlobal: false,
        };

        return this.prismaService.$transaction([
            this.prismaService.campaign.findMany({
                where,
                include: {
                    participant: params.userRelated
                        ? {
                              include: {
                                  user: {
                                      include: {
                                          profile: true,
                                      },
                                  },
                              },
                              where: { userId: user?.id },
                          }
                        : false,
                    crypto_currency: true,
                    campaign_media: true,
                    campaign_template: true,
                },
                orderBy: { endDate: "desc" },
                skip: params.skip,
                take: params.take,
            }),
            this.prismaService.campaign.count({ where }),
        ]);
    }
    public async findCampaignById(campaignId: string) {
        return this.prismaService.campaign.findFirst({
            where: {
                id: {
                    equals: campaignId,
                },
            },
        });
    }
    public async findCryptoCurrencyById(cryptoId: string) {
        return this.prismaService.cryptoCurrency.findFirst({
            where: {
                id: cryptoId,
            },
        });
    }
}
