import { Prisma, user as User } from "@prisma/client";
import { Injectable } from "@tsed/di";
import { prisma } from "../clients/prisma";
import { ListCampaignsVariablesV2 } from "../types";

@Injectable()
export class CampaignService {
    /**
     * Retrieves a paginated list of campaigns
     *
     * @param params the search parameters for the campaigns
     * @param user an optional user include in the campaign results (depends on params.userRelated)
     * @returns the list of campaigns, and a count of total campaigns, matching the parameters
     */
    public async findCampaignsByStatus(params: ListCampaignsVariablesV2, user?: User) {
        const now = new Date();

        const where: Prisma.campaignWhereInput = {
            ...(params.state === "OPEN" ? { endDate: { gte: now } } : {}),
            ...(params.state === "CLOSED" ? { endDate: { lte: now } } : {}),
            status: params.status || "APPROVED",
            isGlobal: false,
        };

        return prisma.$transaction([
            prisma.campaign.findMany({
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
            prisma.campaign.count({ where }),
        ]);
    }
}
