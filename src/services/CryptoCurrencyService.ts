import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class CryptoCurrencyService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves a paginated list of campaigns
     *
     * @param params the search parameters for the campaigns
     * @param user an optional user include in the campaign results (depends on params.userRelated)
     * @returns the list of campaigns, and a count of total campaigns, matching the parameters
     */

    public async findCryptoCurrencyById(cryptoId: string) {
        return this.prismaService.cryptoCurrency.findFirst({
            where: {
                id: cryptoId,
            },
        });
    }
}
