import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class CryptoCurrencyService {
    @Inject()
    private prismaService: PrismaService;

    public async findCryptoCurrencyById(cryptoId: string) {
        return this.prismaService.cryptoCurrency.findFirst({
            where: {
                id: cryptoId,
            },
        });
    }

    public async findCryptoCurrencies() {
        return this.prismaService.cryptoCurrency.findMany();
    }
}
