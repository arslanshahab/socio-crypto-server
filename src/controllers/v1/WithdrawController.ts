import { Context, QueryParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { Enum, Get, Property, Returns } from "@tsed/schema";
import { SuccessArrayResult, SuccessResult } from "../../util/entities";
import { TransferService } from "../../services/TransferService";
import { UserService } from "../../services/UserService";
import { NotFound } from "@tsed/exceptions";
import { ORG_NOT_FOUND, TRANSFER_NOT_FOUND } from "../../util/errors";
import { TransferStatus } from "../../util/constants";
import { TransferResultModel } from "../../models/RestModels";
import { OrganizationService } from "../../services/OrganizationService";

export class WithdrawStatusParams {
    @Property() @Enum(TransferStatus) public readonly status: TransferStatus;
}

@Controller("/withdraw")
export class WithdrawController {
    @Inject()
    private transferService: TransferService;
    @Inject()
    private userService: UserService;
    @Inject()
    private organizationService: OrganizationService;

    @Get()
    @(Returns(200, SuccessResult).Of(Object))
    public async getWithdrawalsV2(@QueryParams() query: WithdrawStatusParams, @Context() context: Context) {
        let orgId;
        if (context.get("user").company) {
            const { company } = this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
            const org = await this.organizationService.findOrganizationByCompanyName(company!);
            if (!org) throw new NotFound(ORG_NOT_FOUND);
            orgId = org.id;
        }
        const { status = "PENDING" } = query;
        const transfers = await this.transferService.getWithdrawalsByStatus(status, orgId);
        if (!transfers) throw new NotFound(TRANSFER_NOT_FOUND);
        const uniqueUsers: { [key: string]: any } = {};
        for (let i = 0; i < transfers.length; i++) {
            const transfer = transfers[i];
            const userId = transfer.wallet?.userId;
            if (!uniqueUsers[userId!]) {
                const totalWithdrawnThisYear = await this.transferService.getTotalAnnualWithdrawalByWallet(
                    transfer.walletId!
                );
                const totalPendingWithdrawal = await this.transferService.getTotalPendingByCurrencyInUsd(
                    transfer.walletId!
                );
                uniqueUsers[userId!] = {
                    user: { ...transfer.wallet?.user, username: transfer.wallet?.user?.profile?.username },
                    totalPendingWithdrawal: totalPendingWithdrawal,
                    totalAnnualWithdrawn: totalWithdrawnThisYear,
                    transfers: [transfer],
                };
            } else {
                uniqueUsers[userId!].transfers.push(transfer);
            }
        }
        return new SuccessResult(Object.values(uniqueUsers), Object);
    }

    // For admin panel
    @Get("/history")
    @(Returns(200, SuccessArrayResult).Of(TransferResultModel))
    public async getWithdrawalHistory(@Context() context: Context) {
        const { company } = this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const org = await this.organizationService.findOrganizationByCompanyName(company!);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const transfers = await this.transferService.getAuditedWithdrawals(org.id);
        return new SuccessArrayResult(TransferResultModel.buildArray(transfers), TransferResultModel);
    }
}
