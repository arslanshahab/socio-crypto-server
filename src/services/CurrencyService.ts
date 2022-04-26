import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class CurrencyService {
    @Inject()
    private prismaService: PrismaService;

    public async getCurrenciesByUserId(userId: string) {
        return this.prismaService.currency.findMany({
            where: {
                wallet: { userId },
            },
            include: { token: true },
        });
    }
}
