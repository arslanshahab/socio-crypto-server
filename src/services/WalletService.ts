import { Injectable } from "@tsed/di";
import { UseCache } from "@tsed/common";
import { Prisma, User } from "@prisma/client";
import { prepareCacheKey } from "../util";
import { CacheKeys } from "../util/constants";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class WalletService {
    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.WALLET_BY_ORG_SERVICE, args),
    })
    public async findWalletByOrgId(orgId: string, include?: Prisma.WalletInclude) {
        return readPrisma.wallet.findFirst({
            where: {
                orgId,
            },
            include,
        });
    }

    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.WALLET_BY_ID_SERVICE, args),
    })
    public async findWalletById(id: string, include?: Prisma.WalletInclude) {
        return readPrisma.wallet.findFirst({
            where: {
                id,
            },
            include,
        });
    }

    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.WALLET_BY_USER_SERVICE, args),
    })
    public async findWalletByUserId(userId: string, include?: Prisma.WalletInclude) {
        return readPrisma.wallet.findFirst({
            where: { userId },
            include,
        });
    }

    public async ifWalletBelongsToOrg(id: string) {
        return readPrisma.wallet.findFirst({
            where: { id, NOT: { orgId: null } },
        });
    }

    public async createWallet(user: User) {
        return await prisma.wallet.create({
            data: {
                userId: user.id,
            },
        });
    }
}
