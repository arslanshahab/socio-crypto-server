import { BodyParams, Context, PathParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { Get, Post, Required, Returns } from "@tsed/schema";
import { ADMIN_NOT_FOUND, INVALID_USER_COMPANY, ORG_NOT_FOUND } from "../../util/errors";
import { AdminService } from "../../services/AdminService";
import { OrganizationService } from "../../services/OrganizationService";
import { UserService } from "../../services/UserService";
import { SuccessResult, Pagination, SuccessArrayResult } from "../../util/entities";
import {
    BooleanResultModel,
    OrgDetailsModel,
    OrgEmployeesResultModel,
    VerifySessionResultModel,
} from "../../models/RestModels";
import { Firebase } from "../../clients/firebase";
import { SesClient } from "../../clients/ses";
import { COIIN, RAIINMAKER_ORG_NAME } from "../../util/constants";
import { WalletService } from "../../services/WalletService";
import { WalletCurrencyService } from "../../services/WalletCurrencyService";

class NewUserParams {
    @Required() public readonly name: string;
    @Required() public readonly email: string;
    @Required() public readonly role: string;
}
class DeleteUserParams {
    @Required() public readonly adminId: string;
}

class RegisterOrgParams {
    @Required() public readonly orgName: string;
    @Required() public readonly email: string;
    @Required() public readonly name: string;
}

@Controller("/organization")
export class OrganizationController {
    @Inject()
    private organizationService: OrganizationService;
    @Inject()
    private adminService: AdminService;
    @Inject()
    private userService: UserService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private walletCurrencyService: WalletCurrencyService;

    @Get("/list-employees")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(OrgEmployeesResultModel))
    public async listEmployees(@Context() context: Context) {
        const { company } = this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const org = await this.organizationService.findOrganizationByCompanyName(company!);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const admins = await this.adminService.listAdminsByOrg(org.id);
        const orgName = org?.name;
        const adminsDetails = await admins.map((admin) => {
            return {
                id: admin.id,
                name: admin.name,
                firebaseId: admin.firebaseId,
                createdAt: admin.createdAt,
            };
        });
        const result = { adminsDetails, orgName };
        return new SuccessResult(result, OrgEmployeesResultModel);
    }

    // For admin panel
    @Get("/org-details")
    @(Returns(200, SuccessResult).Of(OrgDetailsModel))
    public async getOrgDetails(@Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
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
        const { company } = this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { email, name, role } = body;
        const password = Math.random().toString(16).substr(2, 15);
        const org = await this.organizationService.findOrganizationByCompanyName(company!);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const user = await Firebase.createNewUser(email, password);
        const userRole = role === "admin" ? "admin" : "manager";
        await Firebase.setCustomUserClaims(user.uid, company!, userRole, true);
        await this.adminService.createAdmin({ firebaseId: user.uid, orgId: org.id, name });
        await SesClient.sendNewUserConfirmationEmail(org.name, email, password);
    }

    // For admin panel
    @Post("/delete-user/:adminId")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async deleteUser(@PathParams() path: DeleteUserParams, @Context() context: Context) {
        const { adminId } = path;
        const { company } = this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const org = await this.organizationService.findOrganizationByCompanyName(company!);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const admin = await this.adminService.findAdminById(adminId);
        if (!admin) throw new NotFound(ADMIN_NOT_FOUND);
        await Firebase.deleteUser(admin.firebaseId);
        await this.adminService.deleteAdmin(admin.id);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    // For admin panel
    @Get("/verify-session")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async getUserRole(@Context() context: Context) {
        context = context.get("user");
        const result = {
            role: context.role ? context.role : null,
            company: context.company ? context.company : null,
            tempPass: context.tempPass ? context.tempPass : null,
        };
        return new SuccessResult(result, VerifySessionResultModel);
    }

    // For admin panel
    @Post("/register")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async newOrg(@BodyParams() body: RegisterOrgParams, @Context() context: Context) {
        const { company } = this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { orgName, email, name } = body;
        if (company !== RAIINMAKER_ORG_NAME) throw new BadRequest(INVALID_USER_COMPANY);
        const orgNameToLower = orgName.toLowerCase();
        const password = Math.random().toString(16).substr(2, 15);
        const user = await Firebase.createNewUser(email, password);
        await Firebase.setCustomUserClaims(user.uid, orgNameToLower, "admin", true);
        const org = await this.organizationService.createOrganization(orgNameToLower);
        await this.adminService.createAdmin({ firebaseId: user.uid, orgId: org.id, name });
        const wallet = await this.walletService.createOrgWallet(org.id);
        await this.walletCurrencyService.newWalletCurrency(COIIN, wallet.id);
        await SesClient.sendNewOrgConfirmationEmail(orgName, email, password);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }
}
