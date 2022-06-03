import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { SymbolNetworkParams } from "../types";
import { RAIINMAKER_ORG_NAME } from "../util/constants";
import { NotFound } from "@tsed/exceptions";
import { TatumClientService } from "./TatumClientService";
import { CurrencyService } from "./CurrencyService";

@Injectable()
export class OrganizationService {
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private tatumClientService: TatumClientService;
    @Inject()
    private currencyService: CurrencyService;

    public async findOrganizationByCompanyName(companyName: string) {
        return this.prismaService.org.findFirst({
            where: {
                name: companyName,
            },
            include: {
                wallet: {
                    include: {
                        wallet_currency: true,
                    },
                },
            },
        });
    }

    public async getCurrencyForRaiinmaker(data: SymbolNetworkParams) {
        const raiinmakerOrg = await this.findOrganizationByCompanyName(RAIINMAKER_ORG_NAME);
        if (!raiinmakerOrg) throw new NotFound(`Org not found for ${RAIINMAKER_ORG_NAME}.`);
        return await this.tatumClientService.findOrCreateCurrency({ ...data, wallet: raiinmakerOrg.wallet! });
    }

    public async findOrgByAdminId(adminId: string) {
        return this.prismaService.org.findFirst({
            where: {
                id: adminId,
            },
        });
    }

    public async orgDetails() {
        return this.prismaService.org.findMany({
            include: { campaign: true, admin: true },
        });
    }

    public async getAvailableBalance(orgId: string) {
        const currency = await this.currencyService.findCurrencyByOrgId(orgId);
        if (!currency) throw new NotFound("Currency not found for org.");
        const tatumBalance = await this.tatumClientService.getAccountBalance(currency.tatumId);
        return parseFloat(tatumBalance.availableBalance || "0");
    }
}
