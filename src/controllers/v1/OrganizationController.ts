import { BodyParams, Context, PathParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { NotFound } from "@tsed/exceptions";
import { Get, Post, Put, Required, Returns } from "@tsed/schema";
import { ADMIN_NOT_FOUND, ORGANIZATION_NAME_ALREADY_EXISTS } from "../../util/errors";
import { AdminService } from "../../services/AdminService";
import { OrganizationService } from "../../services/OrganizationService";
import { SuccessResult, Pagination, SuccessArrayResult } from "../../util/entities";
import {
    AdminProfileResultModel,
    BooleanResultModel,
    OrgDetailsModel,
    OrgEmployeesResultModel,
    VerifySessionResultModel,
} from "../../models/RestModels";
import { Firebase } from "../../clients/firebase";
import { SesClient } from "../../clients/ses";
import { WalletService } from "../../services/WalletService";
import { VerificationService } from "../../services/VerificationService";
import { UserService } from "../../services/UserService";

class NewUserParams {
    @Required() public readonly name: string;
    @Required() public readonly email: string;
    @Required() public readonly role: string;
}
class DeleteUserParams {
    @Required() public readonly adminId: string;
}

class RegisterOrgParams {
    @Required() public readonly company: string;
    @Required() public readonly email: string;
    @Required() public readonly name: string;
    @Required() public readonly password: string;
    @Required() public readonly verificationToken: string;
}

class TwoFactorAuthParms {
    @Required() public readonly twoFactorEnabled: boolean;
}

@Controller("/organization")
export class OrganizationController {
    @Inject()
    private organizationService: OrganizationService;
    @Inject()
    private adminService: AdminService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private verificationService: VerificationService;
    @Inject()
    private userService: UserService;

    @Get("/list-employees")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(OrgEmployeesResultModel))
    public async listEmployees(@Context() context: Context) {
        const { orgId, company } = await this.adminService.checkPermissions(
            { hasRole: ["admin"] },
            context.get("user")
        );
        const admins = await this.adminService.listAdminsByOrg(orgId!);
        const adminsDetails = await admins.map((admin) => {
            return {
                id: admin.id,
                name: admin.name,
                firebaseId: admin.firebaseId,
                createdAt: admin.createdAt,
            };
        });
        const result = { adminsDetails, orgName: company };
        return new SuccessResult(result, OrgEmployeesResultModel);
    }

    // For admin panel
    @Get("/org-details")
    @(Returns(200, SuccessResult).Of(OrgDetailsModel))
    public async getOrgDetails(@Context() context: Context) {
        await this.adminService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const organizations = await this.organizationService.orgDetails();
        const orgDetails = organizations.map((org) => {
            return {
                name: org.name,
                createdAt: org.createdAt,
                adminCount: org.admin.length,
                campaignCount: org.campaign.length,
            };
        });
        return new SuccessArrayResult(orgDetails, OrgDetailsModel);
    }

    // For admin panel
    @Post("/new-user")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async newUser(@BodyParams() body: NewUserParams, @Context() context: Context) {
        const { company, orgId } = await this.adminService.checkPermissions(
            { hasRole: ["admin"] },
            context.get("user")
        );
        const { email, name, role } = body;
        const password = Math.random().toString(16).substr(2, 15);
        const user = await Firebase.createNewUser(email, password);
        const userRole = role === "admin" ? "admin" : "manager";
        await Firebase.setCustomUserClaims(user.uid, company!, userRole, true);
        await this.adminService.createAdmin({ firebaseId: user.uid, orgId: orgId!, name });
        await SesClient.sendNewUserConfirmationEmail(company!, email, password);
    }

    // For admin panel
    @Post("/delete-user/:adminId")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async deleteUser(@PathParams() path: DeleteUserParams, @Context() context: Context) {
        const { adminId } = path;
        await this.adminService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const admin = await this.adminService.findAdminById(adminId);
        if (!admin) throw new NotFound(ADMIN_NOT_FOUND);
        await Firebase.deleteUser(admin.firebaseId);
        await this.adminService.deleteAdmin(admin.id);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    // For admin panel
    @Get("/verify-session")
    @(Returns(200, SuccessResult).Of(VerifySessionResultModel))
    public async getUserRole(@Context() context: Context) {
        const admin = context.get("user");
        const result = {
            role: admin.role || null,
            company: admin.company || null,
            tempPass: admin.tempPass || null,
            email: admin.email || null,
        };
        return new SuccessResult(result, VerifySessionResultModel);
    }

    // For admin panel
    @Post("/register")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async newOrg(@BodyParams() body: RegisterOrgParams) {
        let { company, email, name, password, verificationToken } = body;
        company = company.toLowerCase();
        const foundOrg = await this.organizationService.findOrganizationByName(company);
        console.log(foundOrg);
        if (foundOrg) throw new Error(ORGANIZATION_NAME_ALREADY_EXISTS);
        await this.verificationService.verifyToken({ verificationToken, email });
        const user = await Firebase.createNewUser(email, password);
        await Firebase.setCustomUserClaims(user.uid, company, "admin", false);
        const org = await this.organizationService.createOrganization(company);
        await this.adminService.createAdmin({ firebaseId: user.uid, orgId: org.id, name });
        await this.walletService.createOrgWallet(org.id);
        await SesClient.sendNewOrgCreationEmail(company, email);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    // For admin panel
    @Get("/profile")
    @(Returns(200, SuccessResult).Of(AdminProfileResultModel))
    public async getProfile(@Context() context: Context) {
        const { company, email } = await this.adminService.checkPermissions(
            { hasRole: ["admin"] },
            context.get("user")
        );
        const admin = await this.userService.findUserByFirebaseId(context.get("user").uid);
        const result = { name: admin?.name, email: email, company: company };
        return new SuccessResult(result, AdminProfileResultModel);
    }

    // For admin panel
    @Put("/two-factor-auth")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async twoFactorAuth(@BodyParams() body: TwoFactorAuthParms, @Context() context: Context) {
        await this.adminService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const admin = await this.userService.findUserByFirebaseId(context.get("user").uid);
        if (!admin) throw new NotFound(ADMIN_NOT_FOUND);
        const { twoFactorEnabled } = body;
        await this.adminService.updateAdminAuth(admin.id, twoFactorEnabled);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }
}
