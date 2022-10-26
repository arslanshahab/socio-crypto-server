import { Controller, Inject } from "@tsed/di";
import { Get, Returns } from "@tsed/schema";
import { SuccessArrayResult } from "../../util/entities";
import { Context } from "@tsed/common";
import { OrganizationService } from "../../services/OrganizationService";
import { NotFound } from "@tsed/exceptions";
import { ORG_NOT_FOUND, WALLET_NOT_FOUND } from "../../util/errors";
import { WalletService } from "../../services/WalletService";
import { CurrencyService } from "../../services/CurrencyService";
import { TatumService } from "../../services/TatumService";
import { formatFloat, getCryptoAssestImageUrl } from "../../util";
import { AllCurrenciesResultModel, TransferResultModel } from "../../models/RestModels";
import { TransferService } from "../../services/TransferService";
import { AdminService } from "../../services/AdminService";
import { ADMIN, MANAGER } from "src/util/constants.ts";

@Controller("/funding-wallet")
export class FundingWalletController {
    @Inject()
    private organizationService: OrganizationService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private currencyService: CurrencyService;
    @Inject()
    private tatumService: TatumService;
    @Inject()
    private transferService: TransferService;
    @Inject()
    private adminService: AdminService;

    @Get()
    @(Returns(200, SuccessArrayResult).Of(AllCurrenciesResultModel))
    public async getFundingWallet(@Context() context: Context) {
        const { orgId } = await this.adminService.checkPermissions({ hasRole: [ADMIN, MANAGER] }, context.get("user"));
        const org = await this.organizationService.findOrgById(orgId!);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const wallet = await this.walletService.findWalletByOrgId(org.id);
        if (!wallet) throw new NotFound(WALLET_NOT_FOUND);
        const currencies = await this.currencyService.findCurrenciesByWalletId(wallet.id, { token: true });
        const balances = await this.tatumService.getBalanceForAccountList(currencies);
        let allCurrencies = currencies.map((currencyItem) => {
            const balance = balances.find((balanceItem) => currencyItem.tatumId === balanceItem.tatumId);
            const symbol = currencyItem?.token?.symbol || "";
            return {
                balance: formatFloat(balance.availableBalance),
                type: symbol,
                symbolImageUrl: getCryptoAssestImageUrl(symbol),
                network: currencyItem?.token?.network || "",
            };
        });
        return new SuccessArrayResult(allCurrencies, AllCurrenciesResultModel);
    }

    @Get("/transaction-history")
    @(Returns(200, SuccessArrayResult).Of(Object))
    public async transactionHistory(@Context() context: Context) {
        const { orgId } = await this.adminService.checkPermissions({ hasRole: [ADMIN, MANAGER] }, context.get("user"));
        const org = await this.organizationService.findOrgById(orgId!);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const wallet = await this.walletService.findWalletByOrgId(org.id);
        if (!wallet) throw new NotFound(WALLET_NOT_FOUND);
        const transfer = await this.transferService.findTransactionsByWalletId(wallet.id);
        return new SuccessArrayResult(TransferResultModel.buildArray(transfer), TransferResultModel);
    }
}
