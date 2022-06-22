import { Controller, Inject } from "@tsed/di";
import { Get, Returns } from "@tsed/schema";
import { SuccessArrayResult } from "../../util/entities";
import { CryptoCurrencyService } from "../../services/CryptoCurrencyService";
import { UserService } from "../../services/UserService";
import { Context } from "@tsed/common";
import { CryptoCurrencyResultModel } from "../../models/RestModels";

@Controller("/crypto")
export class CryptoController {
    @Inject()
    private cryptoService: CryptoCurrencyService;
    @Inject()
    private userService: UserService;

    @Get("/supported-crypto")
    @(Returns(200, SuccessArrayResult).Of(CryptoCurrencyResultModel))
    public async listSupportedCrypto(@Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const crypto = await this.cryptoService.findCryptoCurrencies();
        return new SuccessArrayResult(crypto, CryptoCurrencyResultModel);
    }

    // @Post("/crypto-to-wallet")
    // @(Returns(200, SuccessArrayResult).Of(Object))
    // public async addCryptoToWallet(@Context() context: Context) {}
}
