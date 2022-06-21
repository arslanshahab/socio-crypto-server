import { Context, QueryParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { Get, Required, Returns } from "@tsed/schema";
import { SuccessArrayResult, SuccessResult } from "../../util/entities";
import { UserService } from "../../services/UserService";
import { TatumClientService } from "../../services/TatumClientService";
import { DepositAddressResultModel, SupportedCurrenciesResultModel } from "../../models/RestModels";
import { NotFound } from "@tsed/exceptions";
import { WalletService } from "../../services/WalletService";
import { ADMIN_NOT_FOUND } from "../../util/errors";

class DepositAddressParams {
    @Required() public readonly symbol: string;
    @Required() public readonly network: string;
}

@Controller("/tatum")
export class TatumController {
    @Inject()
    private userService: UserService;
    @Inject()
    private tatumClientService: TatumClientService;
    @Inject()
    private walletService: WalletService;

    @Get("/supported-currencies")
    @(Returns(200, SuccessArrayResult).Of(SupportedCurrenciesResultModel))
    public async getSupportedCurrencies(@Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const currencies = await this.tatumClientService.getAllCurrencies();
        return new SuccessArrayResult(currencies, SupportedCurrenciesResultModel);
    }

    @Get("/deposit-address")
    @(Returns(200, SuccessResult).Of(DepositAddressResultModel))
    public async getDepositAddress(@QueryParams() query: DepositAddressParams, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const admin = await this.userService.findUserByFirebaseId(context.get("user").id);
        if (!admin) throw new NotFound(ADMIN_NOT_FOUND);
        const wallet = await this.walletService.findWalletByOrgId(admin.orgId!);
        const { symbol, network } = query;
        const token = await this.tatumClientService.isCurrencySupported({ symbol, network });
        if (!token) throw new Error("Currency not supported");
        const ledgerAccount = await this.tatumClientService.findOrCreateCurrency({ network, symbol, wallet: wallet! });
        if (!ledgerAccount) throw new Error("Ledger account not found.");
        const result = {
            symbol: token.symbol,
            address: ledgerAccount.depositAddress,
            fromTatum: true,
            destinationTag: ledgerAccount.destinationTag,
            memo: ledgerAccount.memo,
            message: ledgerAccount.message,
        };
        return new SuccessResult(result, DepositAddressResultModel);
    }
}
