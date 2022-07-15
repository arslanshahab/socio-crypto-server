import { Injectable } from "@tsed/di";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class EscrowService {
    public async findEscrowByCampaignId(campaignId: string) {
        return readPrisma.escrow.findMany({
            where: { campaignId },
        });
    }

    public async deleteEscrow(campaignId: string) {
        return await prisma.escrow.deleteMany({
            where: { campaignId },
        });
    }
}
