import { Controller, Inject } from "@tsed/di";
import { Delete, Get, Post, Property, Required, Returns } from "@tsed/schema";
import { SuccessArrayResult, SuccessResult } from "../../util/entities";
import { CryptoCurrencyService } from "../../services/CryptoCurrencyService";
import { BodyParams, Context } from "@tsed/common";
import {
    BooleanResultModel,
    CoiinValueResultModel,
    CryptoCurrencyResultModel,
    UpdatedResultModel,
    WalletCurrencyResultModel,
} from "../../models/RestModels";
import { OrganizationService } from "../../services/OrganizationService";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { CURRENCY_NOT_FOUND, ORG_NOT_FOUND, TOKEN_NOT_FOUND, WALLET_NOT_FOUND } from "../../util/errors";
import { WalletCurrencyService } from "../../services/WalletCurrencyService";
import { AdminService } from "../../services/AdminService";
import {
    ADMIN,
    CoiinTransferAction,
    MANAGER,
    TransferAction,
    TransferStatus,
    TransferType,
} from "../../util/constants";
import { TokenService } from "../../services/TokenService";
import { CurrencyService } from "../../services/CurrencyService";
import { TatumService } from "../../services/TatumService";
import { WalletService } from "../../services/WalletService";
import { TransferService } from "../../services/TransferService";

class CryptoToWalletParams {
    @Required() public readonly contractAddress: string;
}

class DeleteCryptoFromWalletParams {
    @Required() public readonly id: string;
}

class TransferCryptoParams {
    @Required() public readonly amount: string;
    @Required() public readonly userId: string;
    @Property() public readonly action: string;
    @Required() public readonly symbol: string;
    @Required() public readonly network: string;
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
    @Inject()
    private tokenService: TokenService;
    @Inject()
    private currencyService: CurrencyService;
    @Inject()
    private tatumService: TatumService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private transferService: TransferService;

    @Get("/supported-crypto")
    @(Returns(200, SuccessArrayResult).Of(CryptoCurrencyResultModel))
    public async listSupportedCrypto(@Context() context: Context) {
        await this.adminService.checkPermissions({ hasRole: [ADMIN] }, context.get("user"));
        const crypto = await this.cryptoCurrencyService.findCryptoCurrencies();
        return new SuccessArrayResult(crypto, CryptoCurrencyResultModel);
    }

    @Post("/add-to-wallet")
    @(Returns(200, SuccessArrayResult).Of(WalletCurrencyResultModel))
    public async addCryptoToWallet(@BodyParams() body: CryptoToWalletParams, @Context() context: Context) {
        const { company } = await this.adminService.checkPermissions(
            { hasRole: [ADMIN, MANAGER] },
            context.get("user")
        );
        if (!company) throw new NotFound("Company not found");
        const { contractAddress } = body;
        const org = await this.organizationService.findOrganizationByName(company!, { wallet: true });
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
            { hasRole: [ADMIN, MANAGER] },
            context.get("user")
        );
        if (!company) throw new NotFound("Company not found");
        const { id } = body;
        const org = await this.organizationService.findOrganizationByName(company!, { wallet: true });
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const currency = await this.walletCurrencyService.findWalletCurrencyByWalletId(org.wallet?.id!, id);
        if (!currency) throw new NotFound("Currency not found");
        if (parseFloat(currency.balance) > 0) throw new BadRequest("FUNDS_EXIST", "wallet holds crypto");
        await this.walletCurrencyService.deleteWalletCurrency(id);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Get("/coiin-value")
    @(Returns(200, SuccessResult).Of(CoiinValueResultModel))
    public async getCoiinValue(@Context() context: Context) {
        const coiin = process.env.COIIN_VALUE || "0.2";
        return new SuccessResult({ coiin }, CoiinValueResultModel);
    }

    // For admin panel
    @Post("/transfer")
    @(Returns(200, SuccessResult).Of(UpdatedResultModel))
    public async transferUserCoiin(@BodyParams() body: TransferCryptoParams, @Context() context: Context) {
        const { orgId } = await this.adminService.checkPermissions({ hasRole: [ADMIN] }, context.get("user"));
        const { amount, userId, action, symbol, network } = body;
        const { ADD } = CoiinTransferAction;
        const token = await this.tokenService.findTokenBySymbol({ symbol: symbol, network: network });
        if (!token) throw new NotFound(`${TOKEN_NOT_FOUND} for ${symbol} and ${network}`);
        const userWallet = await this.walletService.findWalletByUserId(userId);
        if (!userWallet) throw new NotFound(WALLET_NOT_FOUND + " for userId");
        const orgWallet = await this.walletService.findWalletByOrgId(orgId || "");
        if (!orgWallet) throw new NotFound(WALLET_NOT_FOUND + " for orgId");
        const userCurrency = await this.currencyService.findCurrencyByTokenAndWallet({
            tokenId: token.id,
            walletId: userWallet.id,
        });
        if (!userCurrency) throw new NotFound(CURRENCY_NOT_FOUND + " for user");
        const orgCurrency = await this.currencyService.findCurrencyByTokenAndWallet({
            tokenId: token.id,
            walletId: orgWallet?.id!,
        });
        if (!orgCurrency) throw new NotFound(CURRENCY_NOT_FOUND + " for org");
        const orgAvailableBalance = await this.tatumService.getAccountBalance(orgCurrency.tatumId);
        const userAvailableBalance = await this.tatumService.getAccountBalance(userCurrency.tatumId);
        if (action === ADD) {
            let coiinTransferStatus = TransferStatus.PENDING;
            if (orgAvailableBalance.availableBalance >= amount) {
                await this.tatumService.transferFunds({
                    senderAccountId: orgCurrency.tatumId,
                    recipientAccountId: userCurrency.tatumId,
                    amount,
                    recipientNote: "Transfer amount",
                });
                coiinTransferStatus = TransferStatus.SUCCEEDED;
            }
            await this.transferService.newReward({
                action: TransferAction.TRANSFER,
                amount,
                status: coiinTransferStatus,
                symbol,
                type: TransferType.CREDIT,
                walletId: userWallet.id,
            });
            await this.transferService.newReward({
                action: TransferAction.TRANSFER,
                amount,
                status: coiinTransferStatus,
                symbol,
                type: TransferType.DEBIT,
                walletId: orgWallet.id,
            });
        } else {
            let coiinTransferStatus = TransferStatus.PENDING;
            if (userAvailableBalance.availableBalance >= amount) {
                await this.tatumService.transferFunds({
                    senderAccountId: userCurrency.tatumId,
                    recipientAccountId: orgCurrency.tatumId,
                    amount,
                    recipientNote: "Transfer amount",
                });
                coiinTransferStatus = TransferStatus.SUCCEEDED;
            }
            await this.transferService.newReward({
                action: TransferAction.TRANSFER,
                amount,
                status: coiinTransferStatus,
                symbol,
                type: TransferType.CREDIT,
                walletId: orgWallet.id,
            });
            await this.transferService.newReward({
                action: TransferAction.TRANSFER,
                amount,
                status: coiinTransferStatus,
                symbol,
                type: TransferType.DEBIT,
                walletId: userWallet.id,
            });
        }
        return new SuccessResult({ message: "Transfer cryptos successfully" }, UpdatedResultModel);
    }
}
