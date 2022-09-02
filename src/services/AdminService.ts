import { Inject, Injectable } from "@tsed/di";
import { AdminTypes, JWTPayload } from "../types";
import { readPrisma, prisma } from "../clients/prisma";
import { Forbidden } from "@tsed/exceptions";
import { OrganizationService } from "./OrganizationService";
import { Prisma } from "@prisma/client";

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
        const { role, company, email } = user;
        if (company) {
            if (opts.hasRole && (!role || !opts.hasRole.includes(role))) throw new Forbidden("Forbidden");
            if (opts.restrictCompany && company !== opts.restrictCompany) throw new Forbidden("Forbidden");
            if (role === "manager" && !company) throw new Forbidden("Forbidden, company not specified");
            const org = await this.organizationService.findOrganizationByName(company!);
            return { role, company, orgId: org?.id, email };
        }
        return {};
    }

    public async updateAdminAuth(adminId: string, twoFactorEnabled: boolean) {
        return await prisma.admin.update({
            where: { id: adminId },
            data: { twoFactorEnabled },
        });
    }

    public async updateAdmin(id: string, name: string) {
        return await prisma.admin.update({
            where: { id },
            data: { name },
        });
    }

    /**
     * Retrieves an admin object by its firebase id
     *
     * @param firebaseId the firebaseId of the admin
     * @param include additional relations to include with the admin query
     * @returns the admin object, with the requested relations included
     */
    public async findAdminByFirebaseId<T extends Prisma.AdminInclude | undefined>(firebaseId: string, include?: T) {
        return prisma.admin.findFirst<{
            where: Prisma.AdminWhereInput;
            // this type allows adding additional relations to result tpe
            include: T;
        }>({ where: { firebaseId }, include: include as T });
    }
}
