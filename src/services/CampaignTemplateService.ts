import { Injectable } from "@tsed/di";
import { Campaign, CampaignTemplate } from "@prisma/client";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class CampaignTemplateService {
    public async findCampaignTemplateByCampaignId(campaignId: string) {
        return readPrisma.campaignTemplate.findMany({
            where: { campaignId },
        });
    }
    public async deleteCampaignTemplates(campaignId: string) {
        return await prisma.campaignTemplate.deleteMany({
            where: { campaignId },
        });
    }

    public async deleteCampaignTemplate(templateId: string) {
        return await prisma.campaignTemplate.delete({
            where: { id: templateId },
        });
    }

    public async findCampaignTemplateById(campaignTemplateId: string) {
        return readPrisma.campaignTemplate.findFirst({
            where: { id: campaignTemplateId },
        });
    }

    public async upsertTemplate(campaignTemplate: CampaignTemplate, campaign: Campaign) {
        return await prisma.campaignTemplate.upsert({
            where: { id: campaignTemplate.id || campaign.id },
            update: {
                post: campaignTemplate.post,
            },
            create: {
                channel: campaignTemplate.channel,
                post: campaignTemplate.post,
                campaignId: campaign.id,
            },
        });
    }
}
