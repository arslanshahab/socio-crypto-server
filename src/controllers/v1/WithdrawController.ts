import { Context, QueryParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { Enum, Get, Property, Returns } from "@tsed/schema";
import { SuccessResult } from "../../util/entities";
import { TransferService } from "../../services/TransferService";
import { UserService } from "../../services/UserService";
import { NotFound } from "@tsed/exceptions";
import { TRANSFER_NOT_FOUND } from "../../util/errors";
import { TransferStatus } from "../../util/constants";

export class WithdrawStatusParams {
    @Property() @Enum(TransferStatus) public readonly status: TransferStatus;
}

@Controller("/withdraw")
export class WithdrawController {
    @Inject()
    private transferService: TransferService;
    @Inject()
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(Object))
    public async getWithdrawalsV2(@QueryParams() query: WithdrawStatusParams, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { status = "PENDING" } = query;
        const transfers = await this.transferService.getWithdrawalsByStatus(status);
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
}
