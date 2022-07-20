import { Injectable } from "@tsed/di";
import { AdminTypes } from "../types";
import { readPrisma, prisma } from "../clients/prisma";

@Injectable()
export class AdminService {
    public async findAdminByUserId(userId: string) {
        return await readPrisma.admin.findFirst({
            where: {
                firebaseId: userId,
            },
            include: { org: true },
        });
    }

    public async listAdminsByOrg(orgId: string) {
        return await readPrisma.admin.findMany({
            where: {
                org: { id: orgId },
            },
        });
    }

    public async findAdminByFirebaseId(firebaseId: string) {
        return await readPrisma.admin.findFirst({
            where: {
                firebaseId,
            },
        });
    }

    public async createAdmin(data: AdminTypes) {
        return await prisma.admin.create({
            data: {
                firebaseId: data.firebaseId,
                name: data.name,
                orgId: data.orgId,
            },
        });
    }
}
