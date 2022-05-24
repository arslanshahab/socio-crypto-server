import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { SymbolNetworkParams } from "../types";
import { RAIINMAKER_ORG_NAME } from "../util/constants";
import { NotFound } from "@tsed/exceptions";
import { TatumClientService } from "./TatumClientService";

@Injectable()
export class OrganizationService {
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private tatumClientService: TatumClientService;

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
}
