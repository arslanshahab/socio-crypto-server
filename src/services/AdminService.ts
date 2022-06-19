import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class AdminService {
    @Inject()
    private prismaService: PrismaService;

    public async findAdminByUserId(userId: string) {
        return await this.prismaService.admin.findFirst({
            where: {
                firebaseId: userId,
            },
            include: { org: true },
        });
    }

    public async listAdminsByOrg(orgId: string) {
        return await this.prismaService.admin.findMany({
            where: {
                org: { id: orgId },
            },
        });
    }

    public async findAdminByFirebaseId(firebaseId: string) {
        return await this.prismaService.admin.findFirst({
            where: {
                firebaseId,
            },
        });
    }
}
