import { Controller, Inject } from "@tsed/di";
import { Get, Returns } from "@tsed/schema";
import { SuccessArrayResult } from "../../util/entities";
import { UserService } from "../../services/UserService";
import { Context } from "@tsed/common";
import { OrganizationService } from "../../services/OrganizationService";
import { NotFound } from "@tsed/exceptions";
import { ADMIN_NOT_FOUND, ORG_NOT_FOUND, WALLET_NOT_FOUND } from "../../util/errors";
import { WalletService } from "../../services/WalletService";
import { CurrencyService } from "../../services/CurrencyService";
import { TatumClientService } from "../../services/TatumClientService";
import { getCryptoAssestImageUrl } from "../../util";
import { AllCurrenciesResultModel } from "../../models/RestModels";

@Controller("/funding-wallet")
export class FundingWalletController {
    @Inject()
    private userService: UserService;
    @Inject()
    private organizationService: OrganizationService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private currencyService: CurrencyService;
    @Inject()
    private tatumClientService: TatumClientService;

    @Get()
    @(Returns(200, SuccessArrayResult).Of(AllCurrenciesResultModel))
    public async getFundingWallet(@Context() context: Context) {
        const admin = await this.userService.findUserByFirebaseId(context.get("user").id);
        if (!admin) throw new NotFound(ADMIN_NOT_FOUND);
        const org = await this.organizationService.findOrgByAdminId(admin.orgId!);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const wallet = await this.walletService.findWalletByOrgId(org.id);
        if (!wallet) throw new NotFound(WALLET_NOT_FOUND);
        const currencies = await this.currencyService.findCurrencyByWalletId(wallet.id, { token: true });
        const balances = await this.tatumClientService.getBalanceForAccountList(currencies);
        let allCurrencies = currencies.map((currencyItem) => {
            const balance = balances.find((balanceItem) => currencyItem.tatumId === balanceItem.tatumId);
            const symbol = currencyItem?.token?.symbol || "";
            return {
                balance: balance.availableBalance,
                type: symbol,
                symbolImageUrl: getCryptoAssestImageUrl(symbol),
                network: currencyItem?.token?.network || "",
            };
        });
        return new SuccessArrayResult(allCurrencies, AllCurrenciesResultModel);
    }
}
