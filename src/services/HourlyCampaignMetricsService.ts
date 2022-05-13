import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class HourlyCampaignMetricsService {
    @Inject()
    private prismaService: PrismaService;

    public async findCampaignHourlyMetricsByCampaignId(campaignId: string) {
        return this.prismaService.hourlyCampaignMetric.findMany({
            where: { campaignId },
        });
    }

    public async deleteCampaignHourlyMetrics(campaignId: string) {
        return await this.prismaService.hourlyCampaignMetric.deleteMany({
            where: { campaignId },
        });
    }
}
