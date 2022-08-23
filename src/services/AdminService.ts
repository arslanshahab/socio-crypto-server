import { Inject, Injectable } from "@tsed/di";
import { AdminTypes, JWTPayload } from "../types";
import { readPrisma, prisma } from "../clients/prisma";
import { Forbidden } from "@tsed/exceptions";
import { OrganizationService } from "./OrganizationService";

@Injectable()
export class AdminService {
    @Inject()
    private organizationService: OrganizationService;

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

    public async deleteAdmin(adminId: string) {
        return await prisma.admin.delete({
            where: {
                id: adminId,
            },
        });
    }

    public async findAdminById(adminId: string) {
        return await readPrisma.admin.findFirst({ where: { id: adminId } });
    }

    /**
     * Asserts that the user has the given permissions
     *
     * @param opts permissions to check for
     * @param context the user from the request context
     * @returns the user's role, company and orgId
     */
    public async checkPermissions(opts: { hasRole?: string[]; restrictCompany?: string }, user: JWTPayload) {
        const { role, company } = user;
        if (company) {
            if (opts.hasRole && (!role || !opts.hasRole.includes(role))) throw new Forbidden("Forbidden");
            if (opts.restrictCompany && company !== opts.restrictCompany) throw new Forbidden("Forbidden");
            if (role === "manager" && !company) throw new Forbidden("Forbidden, company not specified");
            const org = await this.organizationService.findOrganizationByName(company!);
            return { role, company, orgId: org?.id };
        }
        return {};
    }
}
