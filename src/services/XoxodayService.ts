import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
// import { ListCampaignsVariablesV2, FindCampaignById } from "../types";
// import { DateUtils } from "typeorm/util/DateUtils";
import { initDateFromParams } from "../util/date";

@Injectable()
export class XoxodayService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves a paginated list of campaigns
     *
     * @param params the search parameters for the campaigns
     * @param user an optional user include in the campaign results (depends on params.userRelated)
     * @returns the list of campaigns, and a count of total campaigns, matching the parameters
     */
    public async getLast24HourRedemption(type: string) {
        const date = initDateFromParams({ date: new Date(), d: new Date().getDate() - 0, h: 0, i: 0, s: 0 });
        return this.prismaService.transfer.findFirst({
            where: {
                action: type,
                createdAt: {
                    gt: new Date(date),
                },
            },
        });
    }
}
