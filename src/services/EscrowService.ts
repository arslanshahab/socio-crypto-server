import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class EscrowService {
    @Inject()
    private prismaService: PrismaService;

    public async findEscrowByCampaignId(campaignId: string) {
        return this.prismaService.escrow.findMany({
            where: { campaignId },
        });
    }

    public async deleteEscrow(campaignId: string) {
        return await this.prismaService.escrow.deleteMany({
            where: { campaignId },
        });
    }
}
