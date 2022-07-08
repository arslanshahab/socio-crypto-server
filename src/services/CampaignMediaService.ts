import { Injectable } from "@tsed/di";
import { CampaignMedia } from "@prisma/client";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class CampaignMediaService {
    public async findCampaignMediaByCampaignId(campaignId: string) {
        return readPrisma.campaignMedia.findMany({
            where: { campaignId },
        });
    }

    public async deleteCampaignMedia(campaignId: string) {
        return await prisma.campaignMedia.deleteMany({
            where: { campaignId },
        });
    }

    public async findCampaignMediaById(campaignMediaId: string, socialType?: string) {
        return readPrisma.campaignMedia.findFirst({
            where: socialType
                ? { id: campaignMediaId, channel: { contains: socialType, mode: "insensitive" } }
                : { id: campaignMediaId },
        });
    }

    public async updateNewCampaignMedia(campaignMedia: CampaignMedia, campaignId: string) {
        return await prisma.campaignMedia.create({
            data: {
                channel: campaignMedia.channel,
                media: campaignMedia.media,
                mediaFormat: campaignMedia.mediaFormat,
                isDefault: campaignMedia.isDefault,
                campaignId,
                updatedAt: new Date(),
            },
        });
    }

    public async updateCampaignMedia(campaignMedia: CampaignMedia) {
        return await prisma.campaignMedia.update({
            where: {
                id: campaignMedia.id,
            },
            data: {
                channel: campaignMedia.channel,
                media: campaignMedia.media,
                mediaFormat: campaignMedia.mediaFormat,
                isDefault: campaignMedia.isDefault,
                updatedAt: new Date(),
            },
        });
    }
}
