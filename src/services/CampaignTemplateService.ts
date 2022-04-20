import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class CampaignTemplateService {
    @Inject()
    private prismaService: PrismaService;

    public async findCampaignTemplateByCampaignId(campaignId: string) {
        return this.prismaService.campaignTemplate.findMany({
            where: { campaignId },
        });
    }
    public async deleteCampaignTemplate(campaignId: string) {
        return await this.prismaService.campaignTemplate.deleteMany({
            where: { campaignId },
        });
    }
}
