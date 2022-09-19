import { Injectable } from "@tsed/di";
import { CampaignTemplate } from "@prisma/client";
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

    public async updateCampaignTemplate(campaignTemplates: CampaignTemplate) {
        return await prisma.campaignTemplate.update({
            where: { id: campaignTemplates.id },
            data: {
                post: campaignTemplates.post,
                updatedAt: new Date(),
            },
        });
    }

    public async updateNewCampaignTemplate(campaignTemplate: CampaignTemplate, campaignId: string) {
        return await prisma.campaignTemplate.create({
            data: {
                channel: campaignTemplate.channel,
                post: campaignTemplate.post,
                campaignId,
                updatedAt: new Date(),
            },
        });
    }

    public async findCampaignTemplateById(campaignTemplateId: string) {
        return readPrisma.campaignTemplate.findFirst({
            where: { id: campaignTemplateId },
        });
    }
}
