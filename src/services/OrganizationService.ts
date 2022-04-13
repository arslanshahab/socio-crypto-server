import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class OrganizationService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves a user object from a JWTPayload
     *
     * @param data the jwt payload
     * @param include additional relations to include with the user query
     * @returns the user object, with the requested relations included
     */
    public async findOrganizationByCompanyName(companyName: string) {
        return this.prismaService.org.findFirst({
            where: {
                name: companyName,
            },
            include: {
                wallet: {
                    select: {
                        wallet_currency: true,
                    },
                },
            },
        });
    }
}
