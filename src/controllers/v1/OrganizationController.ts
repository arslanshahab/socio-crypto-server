import { Context } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { NotFound } from "@tsed/exceptions";
import { Get, Returns } from "@tsed/schema";
import { ORG_NOT_FOUND } from "../../util/errors";
import { AdminService } from "../../services/AdminService";
import { OrganizationService } from "../../services/OrganizationService";
import { UserService } from "../../services/UserService";
import { SuccessResult, Pagination } from "../../util/entities";
import { OrgEmployeesResultModel } from "../../models/RestModels";

@Controller("/organization")
export class OrganizationController {
    @Inject()
    private organizationService: OrganizationService;
    @Inject()
    private adminService: AdminService;
    @Inject()
    private userService: UserService;

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
                name: admin.name,
                createdAt: admin.createdAt,
            };
        });
        const result = { adminsDetails, orgName };
        return new SuccessResult(result, OrgEmployeesResultModel);
    }
}
