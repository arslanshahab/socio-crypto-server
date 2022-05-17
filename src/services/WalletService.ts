import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class WalletService {
    @Inject()
    private prismaService: PrismaService;

    public async findWalletByOrgId(orgId: string) {
        return this.prismaService.wallet.findFirst({
            where: {
                orgId,
            },
        });
    }
    public async findWalletById(id: string) {
        return this.prismaService.wallet.findFirst({
            where: {
                id,
            },
            include: {
                user: true,
                org: true,
            },
        });
    }

    public async findWalletByUserId(userId: string) {
        return this.prismaService.wallet.findFirst({
            where: { userId },
        });
    }
}
