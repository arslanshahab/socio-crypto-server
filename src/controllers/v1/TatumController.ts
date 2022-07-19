import { BodyParams, Context, QueryParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { Get, Post, Required, Returns } from "@tsed/schema";
import { SuccessArrayResult, SuccessResult } from "../../util/entities";
import { UserService } from "../../services/UserService";
import { TatumService } from "../../services/TatumService";
import {
    DepositAddressResultModel,
    SupportedCurrenciesResultModel,
    TransactionFeeResultModel,
    WithdrawResultModel,
} from "../../models/RestModels";
import { NotFound } from "@tsed/exceptions";
import { WalletService } from "../../services/WalletService";
import {
    ADMIN_NOT_FOUND,
    CUSTODIAL_ADDERSS_NOT_FOUND,
    CustomError,
    GLOBAL_WITHDRAW_LIMIT,
    KYC_LEVEL_2_NOT_APPROVED,
    NOT_ENOUGH_BALANCE_IN_ACCOUNT,
    TOKEN_NOT_FOUND,
    USER_CURRENCY_NOT_FOUND,
    USER_NOT_FOUND,
    VERIFICATION_TOKEN_EXPIRED,
} from "../../util/errors";
import { VerificationApplicationService } from "../../services/VerificationApplicationService";
import { getWithdrawAddressForTatum } from "../../util/tatumHelper";
import { COIIN, RAIINMAKER_WITHDRAW, WITHDRAW_LIMIT, USER_WITHDRAW } from "../../util/constants";
import { VerificationService } from "../../services/VerificationService";
import { getTokenValueInUSD } from "../../util/exchangeRate";
import { OrganizationService } from "../../services/OrganizationService";
import { CurrencyService } from "../../services/CurrencyService";

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

    @Get("/supported-currencies")
    @(Returns(200, SuccessArrayResult).Of(SupportedCurrenciesResultModel))
    public async getSupportedCurrencies(@Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const currencies = await this.tatumService.getSupportedTokens();
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
        try {
            await this.verificationService.verifyToken({ verificationToken });
        } catch (error) {
            throw new CustomError(VERIFICATION_TOKEN_EXPIRED);
        }
        const userCurrency = await this.currencyService.findCurrencyByTokenAndWallet({
            tokenId: token.id,
            walletId: user.wallet?.id!,
        });
        if (!userCurrency) throw new CustomError(USER_CURRENCY_NOT_FOUND);
        const userAccountBalance = await this.tatumService.getAccountBalance(userCurrency.tatumId);
        if (parseFloat(userAccountBalance.availableBalance) < amount)
            throw new CustomError(NOT_ENOUGH_BALANCE_IN_ACCOUNT);
        if ((await getTokenValueInUSD(symbol, amount)) >= WITHDRAW_LIMIT) throw new CustomError(GLOBAL_WITHDRAW_LIMIT);
        const orgCurrency = await this.organizationService.getCurrencyForRaiinmaker(token);
        if (this.tatumService.isCustodialWallet({ symbol, network }) && !orgCurrency.depositAddress)
            throw new CustomError(CUSTODIAL_ADDERSS_NOT_FOUND);
        await this.tatumService.withdrawFundsToBlockchain({
            senderAccountId: userCurrency.tatumId,
            paymentId: `${USER_WITHDRAW}:${user.id}`,
            senderNote: RAIINMAKER_WITHDRAW,
            address,
            amount: amount.toString(),
            userCurrency,
            orgCurrency,
            token,
            custodialAddress: orgCurrency?.depositAddress || "",
        });
        await this.currencyService.updateBalance({
            currencyId: userCurrency.id,
            accountBalance: userCurrency.accountBalance! - amount,
            availableBalance: userCurrency.availableBalance! - amount,
        });
        return new SuccessResult({ ...body, message: "Withdraw completed cusscesfully" }, WithdrawResultModel);
    }

    @Get("/transaction-fee")
    @(Returns(200, SuccessResult).Of(TransactionFeeResultModel))
    public async getTransactionFee(@BodyParams() body: WithdrawBody, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), { wallet: true });
        if (!user) throw new NotFound(USER_NOT_FOUND);
        let { symbol, network, address, amount } = body;
        address = getWithdrawAddressForTatum(symbol, address);
        const token = await this.tatumService.isCurrencySupported({ symbol, network });
        if (!token) throw new Error(TOKEN_NOT_FOUND);
        const userCurrency = await this.currencyService.findCurrencyByTokenAndWallet({
            tokenId: token.id,
            walletId: user.wallet?.id!,
        });
        if (!userCurrency) throw new CustomError(USER_CURRENCY_NOT_FOUND);
        const orgCurrency = await this.organizationService.getCurrencyForRaiinmaker(token);
        const fee = await this.tatumService.offchainEstimateFee({
            senderAccountId: userCurrency.tatumId,
            paymentId: `${USER_WITHDRAW}:${user.id}`,
            senderNote: RAIINMAKER_WITHDRAW,
            address,
            amount: amount.toString(),
            userCurrency,
            orgCurrency,
            token,
            custodialAddress: orgCurrency?.depositAddress || "",
        });
        return new SuccessResult({ fee }, TransactionFeeResultModel);
    }
}
