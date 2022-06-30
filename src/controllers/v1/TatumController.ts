import { BodyParams, Context, QueryParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { Get, Required, Returns } from "@tsed/schema";
import { SuccessArrayResult, SuccessResult } from "../../util/entities";
import { UserService } from "../../services/UserService";
import { TatumService } from "../../services/TatumService";
import { DepositAddressResultModel, SupportedCurrenciesResultModel } from "../../models/RestModels";
import { NotFound } from "@tsed/exceptions";
import { WalletService } from "../../services/WalletService";
import { ADMIN_NOT_FOUND, KYC_LEVEL_2_NOT_APPROVED, USER_NOT_FOUND } from "../../util/errors";
import { VerificationApplicationService } from "../../services/VerificationApplicationService";
import { getWithdrawAddressForTatum } from "../../util/tatumHelper";

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
    private userService: UserService;
    @Inject()
    private tatumService: TatumService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private verificationApplicationService: VerificationApplicationService;

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

    @Get("/withdraw")
    @(Returns(200, SuccessResult).Of(DepositAddressResultModel))
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
        if (!token) throw new Error(`Currency "${symbol}" is not supported`);
        await Verification.verifyToken({ verificationToken });
        const userCurrency = await Currency.findOne({ where: { wallet: user.wallet, token }, relations: ["token"] });
        if (!userCurrency) throw new Error(`User wallet not found for currency ${symbol}`);
        const userAccountBalance = await TatumClient.getAccountBalance(userCurrency.tatumId);
        if (parseFloat(userAccountBalance.availableBalance) < amount)
            throw new Error("Not enough balance in user account to perform this withdraw.");
        if ((await getTokenValueInUSD(symbol, amount)) >= WITHDRAW_LIMIT)
            throw new Error(errorMap[GLOBAL_WITHDRAW_LIMIT]);
        const raiinmakerCurrency = await Org.getCurrencyForRaiinmaker(userCurrency.token);
        if (TatumClient.isCustodialWallet({ symbol, network }) && !raiinmakerCurrency.depositAddress)
            throw new Error("No custodial address available for raiinmaker");
        const withdrawResp = await TatumClient.withdrawFundsToBlockchain({
            senderAccountId: userCurrency.tatumId,
            paymentId: `${USER_WITHDRAW}:${user.id}`,
            senderNote: RAIINMAKER_WITHDRAW,
            address,
            amount: amount.toString(),
            currency: userCurrency,
            custodialAddress: raiinmakerCurrency?.depositAddress,
        });
        const newTransfer = Transfer.initTatumTransfer({
            txId: withdrawResp?.txId,
            symbol: token.symbol,
            network: token.network,
            amount: new BN(amount),
            action: "WITHDRAW",
            wallet: user.wallet,
            tatumId: address,
            status: "SUCCEEDED",
            type: "DEBIT",
        });
        await newTransfer.save();
        userCurrency.accountBalance = userCurrency.accountBalance - amount;
        userCurrency.availableBalance = userCurrency.availableBalance - amount;
        await userCurrency.save();
        return {
            success: true,
            message: "Withdraw completed successfully",
        };
    }
}
