import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

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
}
