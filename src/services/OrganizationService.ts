import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class OrganizationService {
    @Inject()
    private prismaService: PrismaService;

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
}
