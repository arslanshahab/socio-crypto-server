import { Controller, Inject } from "@tsed/di";
import { Delete, Get, Post, Required, Returns } from "@tsed/schema";
import { SuccessArrayResult, SuccessResult } from "../../util/entities";
import { CryptoCurrencyService } from "../../services/CryptoCurrencyService";
import { BodyParams, Context } from "@tsed/common";
import { BooleanResultModel, CryptoCurrencyResultModel, WalletCurrencyResultModel } from "../../models/RestModels";
import { OrganizationService } from "../../services/OrganizationService";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { ORG_NOT_FOUND } from "../../util/errors";
import { WalletCurrencyService } from "../../services/WalletCurrencyService";
import { AdminService } from "../../services/AdminService";

class CryptoToWalletParams {
    @Required() public readonly contractAddress: string;
}

class DeleteCryptoFromWalletParams {
    @Required() public readonly id: string;
}

@Controller("/crypto")
export class CryptoController {
    @Inject()
    private cryptoCurrencyService: CryptoCurrencyService;
    @Inject()
    private organizationService: OrganizationService;
    @Inject()
    private walletCurrencyService: WalletCurrencyService;
    @Inject()
    private adminService: AdminService;

    @Get("/supported-crypto")
    @(Returns(200, SuccessArrayResult).Of(CryptoCurrencyResultModel))
    public async listSupportedCrypto(@Context() context: Context) {
        await this.adminService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const crypto = await this.cryptoCurrencyService.findCryptoCurrencies();
        return new SuccessArrayResult(crypto, CryptoCurrencyResultModel);
    }

    @Post("/add-to-wallet")
    @(Returns(200, SuccessArrayResult).Of(WalletCurrencyResultModel))
    public async addCryptoToWallet(@BodyParams() body: CryptoToWalletParams, @Context() context: Context) {
        const { company } = await this.adminService.checkPermissions(
            { hasRole: ["admin", "manager"] },
            context.get("user")
        );
        if (!company) throw new NotFound("Company not found");
        const { contractAddress } = body;
        const org = await this.organizationService.findOrganizationByCompanyName(company!, { wallet: true });
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const cryptoCurrency = await this.cryptoCurrencyService.findByContractAddress(contractAddress);
        if (!cryptoCurrency) throw new NotFound("crypto currency not found");
        const walletCurrency = await this.walletCurrencyService.newWalletCurrency(cryptoCurrency.type, org.wallet?.id);
        return new SuccessResult(walletCurrency, WalletCurrencyResultModel);
    }

    @Delete("/delete-from-wallet")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async deleteCryptoFromWallet(@BodyParams() body: DeleteCryptoFromWalletParams, @Context() context: Context) {
        const { company } = await this.adminService.checkPermissions(
            { hasRole: ["admin", "manager"] },
            context.get("user")
        );
        if (!company) throw new NotFound("Company not found");
        const { id } = body;
        const org = await this.organizationService.findOrganizationByCompanyName(company!, { wallet: true });
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const currency = await this.walletCurrencyService.findWalletCurrencyByWalletId(org.wallet?.id!, id);
        if (!currency) throw new NotFound("Currency not found");
        if (parseFloat(currency.balance) > 0) throw new BadRequest("FUNDS_EXIST", "wallet holds crypto");
        await this.walletCurrencyService.deleteWalletCurrency(id);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }
}
