import { BodyParams, Context, QueryParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { Get, Post, Required, Returns } from "@tsed/schema";
import { SuccessArrayResult, SuccessResult } from "../../util/entities";
import { UserService } from "../../services/UserService";
import { TatumService } from "../../services/TatumService";
import {
    BooleanResultModel,
    DepositAddressResultModel,
    SupportedCurrenciesResultModel,
    TransactionFeeResultModel,
    WithdrawResultModel,
} from "../../models/RestModels";
import { NotFound } from "@tsed/exceptions";
import { WalletService } from "../../services/WalletService";
import {
    ADMIN_NOT_FOUND,
    CURRENCY_NOT_FOUND,
    CUSTODIAL_ADDERSS_NOT_FOUND,
    CustomError,
    GLOBAL_WITHDRAW_LIMIT,
    INVALID_ADDRESS,
    KYC_LEVEL_2_NOT_APPROVED,
    NOT_ENOUGH_BALANCE_IN_ACCOUNT,
    ORG_NOT_FOUND,
    TOKEN_NOT_FOUND,
    USER_CURRENCY_NOT_FOUND,
    USER_NOT_FOUND,
} from "../../util/errors";
import { VerificationApplicationService } from "../../services/VerificationApplicationService";
import { getWithdrawAddressForTatum, verifyAddress } from "../../util/tatumHelper";
import { COIIN, RAIINMAKER_WITHDRAW, WITHDRAW_LIMIT, USER_WITHDRAW, ADMIN, MANAGER } from "../../util/constants";
import { VerificationService } from "../../services/VerificationService";
import { getTokenValueInUSD } from "../../util/exchangeRate";
import { OrganizationService } from "../../services/OrganizationService";
import { CurrencyService } from "../../services/CurrencyService";
import { AdminService } from "../../services/AdminService";
import { MarketDataService } from "../../services/MarketDataService";

class DepositAddressParams {
    @Required() public readonly symbol: string;
    @Required() public readonly network: string;
}

class WithdrawBody {
    @Required() public readonly symbol: string;
    @Required() public readonly network: string;
    @Required() public readonly address: string;
    @Required() public readonly amount: number;
    @Required() public readonly verificationToken: string;
}

class NetworkFeeBody {
    @Required() public readonly symbol: string;
    @Required() public readonly network: string;
}

@Controller("/tatum")
export class TatumController {
    @Inject()
    private currencyService: CurrencyService;
    @Inject()
    private userService: UserService;
    @Inject()
    private tatumService: TatumService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private verificationApplicationService: VerificationApplicationService;
    @Inject()
    private verificationService: VerificationService;
    @Inject()
    private organizationService: OrganizationService;
    @Inject()
    private adminService: AdminService;
    @Inject()
    private marketDataService: MarketDataService;

    @Get("/supported-currencies")
    @(Returns(200, SuccessArrayResult).Of(SupportedCurrenciesResultModel))
    public async getSupportedCurrencies(@Context() context: Context) {
        await this.adminService.checkPermissions({ hasRole: [ADMIN, MANAGER] }, context.get("user"));
        const currencies = await this.tatumService.getSupportedTokens();
        return new SuccessArrayResult(currencies, SupportedCurrenciesResultModel);
    }

    @Get("/deposit-address")
    @(Returns(200, SuccessResult).Of(DepositAddressResultModel))
    public async getDepositAddress(@QueryParams() query: DepositAddressParams, @Context() context: Context) {
        const { orgId } = await this.adminService.checkPermissions({ hasRole: [ADMIN, MANAGER] }, context.get("user"));
        const wallet = await this.walletService.findWalletByOrgId(orgId!);
        const { symbol, network } = query;
        const token = await this.tatumService.isCurrencySupported({ symbol, network });
        if (!token) throw new Error("Currency not supported");
        const ledgerAccount = await this.tatumService.findOrCreateCurrency({ network, symbol, wallet: wallet! });
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

    @Post("/withdraw")
    @(Returns(200, SuccessResult).Of(WithdrawResultModel))
    public async withdraw(@BodyParams() body: WithdrawBody, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), { wallet: true });
        if (!user) throw new NotFound(USER_NOT_FOUND);
        if (!(await this.verificationApplicationService.isLevel2Approved(user.id)))
            throw new Error(KYC_LEVEL_2_NOT_APPROVED);
        let { symbol, network, address, amount, verificationToken } = body;
        address = getWithdrawAddressForTatum(symbol, address);
        if (symbol.toUpperCase() === COIIN)
            throw new Error(
                `${symbol} is not available to withdrawal until after the TGE, follow our social channels to learn more!`
            );
        const token = await this.tatumService.isCurrencySupported({ symbol, network });
        if (!token) throw new Error(TOKEN_NOT_FOUND);
        if (!verifyAddress(address, symbol, network)) throw new Error(INVALID_ADDRESS);
        await this.verificationService.verifyToken({ verificationToken });
        const userCurrency = await this.currencyService.findCurrencyByTokenAndWallet({
            tokenId: token.id,
            walletId: user.wallet?.id!,
        });
        if (!userCurrency) throw new CustomError(USER_CURRENCY_NOT_FOUND);
        const userAccountBalance = await this.tatumService.getAccountBalance(userCurrency.tatumId);
        if (parseFloat(userAccountBalance.availableBalance) < amount)
            throw new CustomError(NOT_ENOUGH_BALANCE_IN_ACCOUNT);
        if ((await getTokenValueInUSD(symbol, amount)) >= WITHDRAW_LIMIT) throw new CustomError(GLOBAL_WITHDRAW_LIMIT);
        const baseCurrency = await this.organizationService.getCurrencyForRaiinmaker(token);
        if (this.tatumService.isCustodialWallet({ symbol, network }) && !baseCurrency.depositAddress)
            throw new CustomError(CUSTODIAL_ADDERSS_NOT_FOUND);
        await this.tatumService.withdrawFundsToBlockchain({
            senderAccountId: userCurrency.tatumId,
            paymentId: `${USER_WITHDRAW}:${user.id}`,
            senderNote: RAIINMAKER_WITHDRAW,
            address,
            amount: amount.toString(),
            currency: userCurrency,
            baseCurrency,
            token,
            custodialAddress: baseCurrency?.depositAddress || "",
        });
        await this.currencyService.updateBalance({
            currencyId: userCurrency.id,
            accountBalance: userCurrency.accountBalance! - amount,
            availableBalance: userCurrency.availableBalance! - amount,
        });
        return new SuccessResult({ ...body, message: "Withdraw completed cusscesfully" }, WithdrawResultModel);
    }

    @Post("/admin/withdraw")
    @(Returns(200, SuccessResult).Of(WithdrawResultModel))
    public async withdrawOrgFunds(@BodyParams() body: WithdrawBody, @Context() context: Context) {
        await this.adminService.checkPermissions({ hasRole: [ADMIN] }, context.get("user"));
        const admin = await this.adminService.findAdminByFirebaseId(context.get("user").id);
        if (!admin) throw new NotFound(ADMIN_NOT_FOUND);
        const org = await this.organizationService.findOrgById(admin.orgId!, { wallet: true });
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        let { symbol, network, address, amount, verificationToken } = body;
        address = getWithdrawAddressForTatum(symbol, address);
        if (symbol.toUpperCase() === COIIN)
            throw new Error(
                `${symbol} is not available to withdrawal until after the TGE, follow our social channels to learn more!`
            );
        const token = await this.tatumService.isCurrencySupported({ symbol, network });
        if (!token) throw new Error(TOKEN_NOT_FOUND);
        if (!verifyAddress(address, symbol, network)) throw new Error(INVALID_ADDRESS);
        await this.verificationService.verifyToken({ verificationToken });
        const currency = await this.currencyService.findCurrencyByTokenAndWallet({
            tokenId: token.id,
            walletId: org.wallet?.id!,
        });
        if (!currency) throw new CustomError(CURRENCY_NOT_FOUND);
        const userAccountBalance = await this.tatumService.getAccountBalance(currency.tatumId);
        if (parseFloat(userAccountBalance.availableBalance) < amount)
            throw new CustomError(NOT_ENOUGH_BALANCE_IN_ACCOUNT);
        const baseCurrency = await this.organizationService.getCurrencyForRaiinmaker(token);
        if (this.tatumService.isCustodialWallet({ symbol, network }) && !baseCurrency.depositAddress)
            throw new CustomError(CUSTODIAL_ADDERSS_NOT_FOUND);
        await this.tatumService.withdrawFundsToBlockchain({
            senderAccountId: currency.tatumId,
            paymentId: `${USER_WITHDRAW}:${admin.id}`,
            senderNote: RAIINMAKER_WITHDRAW,
            address,
            amount: amount.toString(),
            currency,
            baseCurrency,
            token,
            custodialAddress: baseCurrency?.depositAddress || "",
        });
        await this.currencyService.updateBalance({
            currencyId: currency.id,
            accountBalance: currency.accountBalance! - amount,
            availableBalance: currency.availableBalance! - amount,
        });
        return new SuccessResult({ ...body, message: "Withdraw completed cusscesfully" }, WithdrawResultModel);
    }

    @Post("/transfer-coiins")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async transferCoiin(
        @BodyParams()
        body: {
            senderAccountId: string;
            recipientAccountId: string;
            amount: string;
            recipientNote: string;
        },
        @Context() context: Context
    ) {
        await this.adminService.checkPermissions({ hasRole: [ADMIN] }, context.get("user"));
        await this.tatumService.transferFunds(body);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Get("/transaction-fee")
    @(Returns(200, SuccessResult).Of(TransactionFeeResultModel))
    public async getTransactionFee(@QueryParams() query: NetworkFeeBody, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), { wallet: true });
        if (!user) throw new NotFound(USER_NOT_FOUND);
        let { symbol, network } = query;
        const marketData = await this.marketDataService.getNetworkFee({ symbol, network });
        if (!marketData) throw new NotFound(`Network fee not found for ${symbol} and ${network}`);
        return new SuccessResult(
            { symbol: marketData.symbol, network: marketData.networkFee, withdrawFee: marketData.networkFee },
            TransactionFeeResultModel
        );
    }
}
