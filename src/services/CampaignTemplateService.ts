import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { CampaignTemplate } from "@prisma/client";

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

    public async updateCampaignTemplate(campaignTemplates: CampaignTemplate) {
        return await this.prismaService.campaignTemplate.update({
            where: { id: campaignTemplates.id },
            data: {
                post: campaignTemplates.post,
                updatedAt: new Date(),
            },
        });
    }
   
    public async updateNewCampaignTemplate(campaignTemplate: CampaignTemplate, campaignId: string) {
        return await this.prismaService.campaignTemplate.create({
            data: {
                channel: campaignTemplate.channel,
                post: campaignTemplate.post,
                campaignId,
                updatedAt: new Date(),
            },
        });
    }

    public async findCampaignTemplateById(campaignTemplateId: string) {
        return this.prismaService.campaignTemplate.findFirst({
            where: { id: campaignTemplateId },
        });
    }
}
