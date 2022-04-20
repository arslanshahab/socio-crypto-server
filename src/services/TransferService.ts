import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class TransferService {
    @Inject()
    private prismaService: PrismaService;

    public async findTransferByCampaignId(campaignId: string) {
        return this.prismaService.transfer.findMany({
            where: { campaignId },
        });
    }

    public async deleteTransferPayouts(campaignId: string) {
        return await this.prismaService.transfer.deleteMany({
            where: { campaignId },
        });
    }
}
