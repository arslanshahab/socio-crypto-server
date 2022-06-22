import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { SymbolNetworkParams } from "../types";
import { RAIINMAKER_ORG_NAME } from "../util/constants";
import { NotFound } from "@tsed/exceptions";
import { TatumClientService } from "./TatumClientService";
import { CurrencyService } from "./CurrencyService";
import { Prisma } from "@prisma/client";

@Injectable()
export class OrganizationService {
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private tatumClientService: TatumClientService;
    @Inject()
    private currencyService: CurrencyService;

    public async findOrganizationByCompanyName<T extends Prisma.OrgInclude | undefined>(
        companyName: string,
        include?: T
    ) {
        return this.prismaService.org.findFirst({
            where: {
                name: companyName,
            },
            include: include as T,
        });
    }

    public async getCurrencyForRaiinmaker(data: SymbolNetworkParams) {
        const raiinmakerOrg = await this.findOrganizationByCompanyName(RAIINMAKER_ORG_NAME, { wallet: true });
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

    public async getAvailableBalance(orgId: string, tokenId: string) {
        const currency = await this.currencyService.findCurrencyByOrgId(orgId, tokenId);
        if (!currency) throw new NotFound("Currency not found for org.");
        const tatumBalance = await this.tatumClientService.getAccountBalance(currency.tatumId);
        return parseFloat(tatumBalance.availableBalance || "0");
    }
}
