import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { UseCache } from "@tsed/common";

@Injectable()
export class WalletService {
    @Inject()
    private prismaService: PrismaService;

    @UseCache({ ttl: 3600, refreshThreshold: 900 })
    public async findWalletByOrgId(orgId: string) {
        return this.prismaService.wallet.findFirst({
            where: {
                orgId,
            },
        });
    }

    @UseCache({ ttl: 3600, refreshThreshold: 900 })
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

    @UseCache({ ttl: 3600, refreshThreshold: 900 })
    public async findWalletByUserId(userId: string) {
        return this.prismaService.wallet.findFirst({
            where: { userId },
        });
    }

    public async ifWalletBelongsToOrg(id: string) {
        return this.prismaService.wallet.findFirst({
            where: { id, NOT: { orgId: null } },
        });
    }
}
