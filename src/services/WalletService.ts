import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { UseCache } from "@tsed/common";
import { User } from "@prisma/client";
import { prepareCacheKey } from "../util";
import { CacheKeys } from "../util/constants";

@Injectable()
export class WalletService {
    @Inject()
    private prismaService: PrismaService;

    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.WALLET_BY_ORG_SERVICE, args),
    })
    public async findWalletByOrgId(orgId: string) {
        return this.prismaService.wallet.findFirst({
            where: {
                orgId,
            },
        });
    }

    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.WALLET_BY_ID_SERVICE, args),
    })
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

    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.WALLET_BY_USER_SERVICE, args),
    })
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

    public async createWallet(user: User) {
        return await this.prismaService.wallet.create({
            data: {
                userId: user.id,
            },
        });
    }
}
