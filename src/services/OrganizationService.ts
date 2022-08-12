import { Inject, Injectable } from "@tsed/di";
import { SymbolNetworkParams } from "../types";
import { RAIINMAKER_ORG_NAME } from "../util/constants";
import { NotFound } from "@tsed/exceptions";
import { TatumService } from "./TatumService";
import { CurrencyService } from "./CurrencyService";
import { Prisma } from "@prisma/client";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class OrganizationService {
    @Inject()
    private tatumService: TatumService;
    @Inject()
    private currencyService: CurrencyService;

    public async findOrganizationByName<T extends Prisma.OrgInclude | undefined>(companyName: string, include?: T) {
        return readPrisma.org.findFirst({
            where: {
                name: companyName.toLowerCase(),
            },
            include: include as T,
        });
    }

    public async getCurrencyForRaiinmaker(data: SymbolNetworkParams) {
        const raiinmakerOrg = await this.findOrganizationByName(RAIINMAKER_ORG_NAME, { wallet: true });
        if (!raiinmakerOrg) throw new NotFound(`Org not found for ${RAIINMAKER_ORG_NAME}.`);
        return await this.tatumService.findOrCreateCurrency({ ...data, wallet: raiinmakerOrg.wallet! });
    }

    public async findOrgByAdminId(adminId: string) {
        return readPrisma.org.findFirst({
            where: {
                id: adminId,
            },
        });
    }

    public async orgDetails() {
        return readPrisma.org.findMany({
            include: { campaign: true, admin: true },
        });
    }

    public async getAvailableBalance(orgId: string, tokenId: string) {
        const currency = await this.currencyService.findCurrencyByOrgId(orgId, tokenId);
        if (!currency) throw new NotFound("Currency not found for org.");
        const tatumBalance = await this.tatumService.getAccountBalance(currency.tatumId);
        return parseFloat(tatumBalance.availableBalance || "0");
    }

    public async initStripeId(orgId: string, stripeId: string) {
        return await prisma.org.update({ where: { id: orgId }, data: { stripeId } });
    }

    public async createOrganization(orgName: string) {
        return await prisma.org.create({ data: { name: orgName } });
    }
}
