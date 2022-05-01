import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { CampaignMedia } from "@prisma/client";

@Injectable()
export class CampaignMediaService {
    @Inject()
    private prismaService: PrismaService;

    public async findCampaignMediaByCampaignId(campaignId: string) {
        return this.prismaService.campaignMedia.findMany({
            where: { campaignId },
        });
    }

    public async deleteCampaignMedia(campaignId: string) {
        return await this.prismaService.campaignMedia.deleteMany({
            where: { campaignId },
        });
    }

    public async findCampaignMediaById(campaignMediaId: string) {
        return this.prismaService.campaignMedia.findFirst({
            where: { id: campaignMediaId },
        });
    }

    public async updateNewCampaignMedia(campaignMedia: CampaignMedia, campaignId: string) {
        return await this.prismaService.campaignMedia.create({
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
        return await this.prismaService.campaignMedia.update({
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
