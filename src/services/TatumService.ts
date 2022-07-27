import { Inject, Injectable } from "@tsed/di";
import { CustodialAddressPayload, SymbolNetworkParams, WalletKeys, WithdrawFeeData, WithdrawPayload } from "../types";
import { RequestData } from "../util/fetchRequest";
import { Secrets } from "../util/secrets";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { Currency, Wallet, Prisma } from "@prisma/client";
import { sleep } from "../controllers/helpers";
import { doFetch } from "../util/fetchRequest";
import { S3Client } from "../clients/s3";
import { getCurrencyForTatum } from "../util/tatumHelper";
import {
    assignDepositAddress,
    blockAmount,
    createAccount,
    generateDepositAddress,
    getAccountBalance,
    offchainCancelWithdrawal,
    offchainCompleteWithdrawal,
    offchainStoreWithdrawal,
    sendCeloOffchainTransaction,
    sendTronOffchainTransaction,
    sendXrpOffchainTransaction,
    storeTransaction,
    Currency as TatumCurrency,
    removeDepositAddress,
} from "@tatumio/tatum";
import {
    CUSTODIAL_NETWORKS,
    NETWORK_TO_NATIVE_TOKEN,
    XRP_DEFAULT_WITHDRAW_FEE,
    BNB_DEFAULT_WITHDRAW_FEE,
    DOGE_DEFAULT_WITHDRAW_FEE,
    BCH_DEFAULT_WITHDRAW_FEE,
    TOKEN_TO_WITHDRAW_ENDPOINT,
    USER_WITHDRAW_FEE,
    TransferType,
    TransferAction,
    TransferStatus,
} from "../util/constants";
import { TokenService } from "./TokenService";
import { TatumWalletService } from "./TatumWalletService";
import { CurrencyService } from "./CurrencyService";
import { WalletService } from "./WalletService";
import { formatFloat } from "../util";
import { MarketDataService } from "./MarketDataService";
import { TransferService } from "./TransferService";
import { prisma } from "../clients/prisma";

@Injectable()
export class TatumService {
    @Inject()
    private tokenService: TokenService;
    @Inject()
    private tatumWalletService: TatumWalletService;
    @Inject()
    private currenyService: CurrencyService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private marketDataService: MarketDataService;
    @Inject()
    private transferService: TransferService;
    private baseUrl = "https://api-eu1.tatum.io/v3";

    public async createCustodialAddress(data: CustodialAddressPayload) {
        try {
            const endpoint = `${this.baseUrl}/blockchain/sc/custodial/batch`;
            const requestData: RequestData = {
                method: "POST",
                url: endpoint,
                payload: data,
                headers: { "x-api-key": Secrets.tatumApiKey },
            };
            return await doFetch(requestData);
        } catch (error) {
            throw new BadRequest(error.message);
        }
    }

    // Get custodial address
    public async getCustodialAddresses(data: { txId: string; chain: string }) {
        try {
            const endpoint = `${this.baseUrl}/blockchain/sc/custodial/${data.chain}/${data.txId}`;
            const requestData: RequestData = {
                method: "GET",
                url: endpoint,
                headers: { "x-api-key": Secrets.tatumApiKey },
            };
            return await doFetch(requestData);
        } catch (error) {
            throw new BadRequest(error.message);
        }
    }

    public async isCurrencySupported(data: SymbolNetworkParams) {
        return await this.tokenService.findToken(data);
    }

    public isCustodialWallet(data: SymbolNetworkParams) {
        return CUSTODIAL_NETWORKS.includes(data.network);
    }

    public isSubCustodialToken = (data: SymbolNetworkParams): boolean => {
        try {
            return this.isCustodialWallet(data) && data.symbol !== data.network;
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    };

    // Get wallet
    public async getWallet(data: SymbolNetworkParams) {
        try {
            let { symbol, network } = data;
            if (!(await this.isCurrencySupported(data)))
                throw new BadRequest(`Currency ${data.symbol} is not supported.`);
            if (this.isCustodialWallet(data)) symbol = network;
            const keys = await S3Client.getTatumWalletKeys(symbol);
            const walletKeys = { ...keys, walletAddress: keys.address };
            const dbWallet = await this.tatumWalletService.findTatumWallet(symbol);
            return { ...walletKeys, currency: dbWallet?.currency, xpub: dbWallet?.xpub, address: dbWallet?.address };
        } catch (error) {
            throw new BadRequest(error.message);
        }
    }

    // Create ledger account
    public async createLedgerAccount(data: {
        symbol: string;
        network: string;
        isCustodial: boolean;
        isOrgWallet: boolean;
    }) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            let { symbol, isCustodial, isOrgWallet } = data;
            const wallet = await this.getWallet({ symbol: data.symbol, network: data.network });
            symbol = getCurrencyForTatum(data);
            return await createAccount({
                currency: symbol,
                ...(!isCustodial && isOrgWallet && { xpub: wallet?.xpub || wallet?.address }),
            });
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new BadRequest(error?.response?.data?.message || error.message);
        }
    }

    // Generate deposit address
    public async generateDepositAddress(accountId: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await generateDepositAddress(accountId);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new BadRequest(error?.response?.data?.message || error.message);
        }
    }

    // Assign address to account
    public async assignAddressToAccount(data: { accountId: string; address: string }) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await assignDepositAddress(data.accountId, data.address);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new BadRequest(error?.response?.data?.message || error.message);
        }
    }

    // Generate custodial address
    public async generateCustodialAddress(data: SymbolNetworkParams) {
        try {
            if (!this.isCustodialWallet(data)) throw new BadRequest("Operation not supported.");
            const wallet = await this.getWallet(data);
            const txResp = await this.createCustodialAddress({
                owner: wallet?.walletAddress || "",
                batchCount: 1,
                fromPrivateKey: wallet?.privateKey || "",
                chain: data.network,
            });
            if (!txResp.txId || txResp.failed) throw new BadRequest("There was an error creating custodial addresses.");
            let addressAvailable = false;
            let address = "";
            while (!addressAvailable) {
                try {
                    const list = await this.getCustodialAddresses({ chain: data.network, txId: txResp.txId });
                    if (list.length) {
                        address = list[0];
                        addressAvailable = true;
                    }
                } catch (error) {
                    sleep(1000);
                }
            }
            return address;
        } catch (error) {
            console.log(error);
            throw new BadRequest(error?.response?.data?.message || error.message);
        }
    }

    /**
     * Adds a new custodial address to the database
     *
     * @param data the address to add
     * @returns the added address
     */
    public async saveAddress(data: { address: string; network: string; wallet: Wallet }) {
        const address: Prisma.CustodialAddressCreateInput = {
            address: data.address,
            chain: data.network,
        };
        if (data.wallet) {
            address.wallet = { connect: { id: data.wallet.id } };
            address.available = false;
        }
        return prisma.custodialAddress.create({ data: address });
    }

    public async getAvailableAddress(data: SymbolNetworkParams & { wallet: Wallet }) {
        let found = await prisma.custodialAddress.findFirst({
            where: { chain: data.network, walletId: data.wallet.id },
        });
        if (!found) {
            found = await prisma.custodialAddress.findFirst({
                where: { chain: data.network, available: true },
            });
        }
        if (!found) {
            const newAddress = await this.generateCustodialAddress(data);
            found = await this.saveAddress({ ...data, address: newAddress });
        }
        return found;
    }

    public async findOrCreateCurrency(data: SymbolNetworkParams & { wallet: Wallet }) {
        const token = await this.isCurrencySupported(data);
        if (!token) throw new NotFound("No token found.");
        const foundWallet = await this.walletService.findWalletById(data.wallet.id);
        if (!foundWallet) throw new NotFound("Wallet not found");
        const isCustodial = this.isCustodialWallet(data);
        const isOrgWallet = Boolean(await this.walletService.ifWalletBelongsToOrg(foundWallet.id));
        let ledgerAccount = await this.currenyService.findLedgerAccount(data.wallet.id, token.id);
        let newDepositAddress;
        if (!ledgerAccount) {
            const newLedgerAccount = await this.createLedgerAccount({ ...data, isCustodial, isOrgWallet });
            if (isOrgWallet) {
                if (isCustodial) {
                    const availableAddress = await this.getAvailableAddress(data);
                    if (!availableAddress) throw new NotFound("No custodial address available.");
                    await this.assignAddressToAccount({
                        accountId: newLedgerAccount.id,
                        address: availableAddress.address,
                    });
                    newDepositAddress = availableAddress;
                } else {
                    newDepositAddress = await this.generateDepositAddress(newLedgerAccount.id);
                }
            }
            ledgerAccount = await this.currenyService.addNewAccount({
                ...newLedgerAccount,
                token,
                symbol: getCurrencyForTatum(data),
                ...(newDepositAddress && { address: newDepositAddress.address }),
                wallet: data.wallet,
            });
        }
        return ledgerAccount;
    }

    // Transfer funds
    public async transferFunds(data: {
        senderAccountId: string;
        recipientAccountId: string;
        amount: string;
        recipientNote: string;
    }) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await storeTransaction(data);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    // Get account balance
    public async getAccountBalance(accountId: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await getAccountBalance(accountId);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    // Block account balance
    public async blockAccountBalance(accountId: string, amount: string, type: string) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await blockAmount(accountId, {
                amount,
                type,
                description: type,
            });
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    // Get all currencies
    public async getSupportedTokens() {
        const tokens = await this.tokenService.getEnabledTokens();
        return tokens.map((token) => ({ symbol: token.symbol, network: token.network }));
    }

    // Get balance for account list
    public async getBalanceForAccountList(accounts: Currency[]) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const promiseArray: Promise<any>[] = [];
            for (let index = 0; index < accounts.length; index++) {
                promiseArray.push(getAccountBalance(accounts[index].tatumId));
            }
            const response = await Promise.all(promiseArray);
            for (let responseIndex = 0; responseIndex < accounts.length; responseIndex++) {
                response[responseIndex]["tatumId"] = accounts[responseIndex].tatumId;
            }
            return response;
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public async prepareTransferFromCustodialWallet(data: WithdrawPayload & WalletKeys): Promise<{ txId: string }> {
        const isSubCustodialToken = this.isSubCustodialToken(data.token);
        const requestData: RequestData = {
            method: "POST",
            url: `${this.baseUrl}/blockchain/sc/custodial/transfer`,
            payload: {
                chain: data.token.network as TatumCurrency,
                custodialAddress: data?.custodialAddress,
                tokenAddress: data.token.contractAddress,
                contractType: isSubCustodialToken ? 0 : 3,
                recipient: data.address,
                amount: data.amount,
                fromPrivateKey: data.privateKey,
            },
            headers: { "x-api-key": Secrets.tatumApiKey },
        };
        return await doFetch(requestData);
    }

    public async sendTokenOffchainTransaction(data: WithdrawPayload & WalletKeys) {
        try {
            const endpoint = `${this.baseUrl}${this.generateWithdrawEndpoint(data.token.symbol)}`;
            const requestData: RequestData = {
                method: "POST",
                url: endpoint,
                payload: {
                    senderAccountId: data.senderAccountId,
                    amount: data.amount,
                    address: data.address,
                    fee: data.fee,
                    mnemonic: data.mnemonic,
                    xpub: data.xpub,
                    paymentId: data.paymentId,
                    senderNote: data.senderNote,
                },
                headers: { "x-api-key": Secrets.tatumApiKey },
            };
            return await doFetch(requestData);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public async sendOffchainTransactionFromCustodial(data: WithdrawPayload & WalletKeys): Promise<{ txId: string }> {
        try {
            const ledgerTX = await offchainStoreWithdrawal({
                senderAccountId: data.userCurrency.tatumId,
                address: data.address,
                amount: data.amount,
                fee: data.fee,
            });
            try {
                const offchainTX = await this.prepareTransferFromCustodialWallet(data);
                await offchainCompleteWithdrawal(ledgerTX.id, offchainTX.txId);
                return offchainTX;
            } catch (error) {
                await offchainCancelWithdrawal(ledgerTX.id);
                throw new Error("There was an error performing blockchain transaction.");
            }
        } catch (error) {
            console.log(error);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public async withdrawFundsToBlockchain(data: WithdrawPayload) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            const wallet = await this.getWallet({
                symbol: data.token.symbol,
                network: data.token.network,
            });
            const payload: WithdrawPayload & WalletKeys = { ...wallet, ...data };
            const chain = payload.token.network;
            const { withdrawAbleAmount, fee } = await this.adjustWithdrawableAmount(payload);
            if (parseFloat(withdrawAbleAmount) <= 0)
                throw new Error("Not enough balance in user account to pay gas fee.");
            const body = {
                ...payload,
                amount: withdrawAbleAmount,
                ...(payload.userCurrency.derivationKey && { index: payload.userCurrency.derivationKey }),
                fee,
            };
            const callWithdrawMethod = async () => {
                switch (chain) {
                    case "BTC":
                        return await this.sendTokenOffchainTransaction(body);
                    case "XRP":
                        return await sendXrpOffchainTransaction(false, body as any);
                    case "BCH":
                        return await this.sendTokenOffchainTransaction(body);
                    case "LTC":
                        return await this.sendTokenOffchainTransaction(body);
                    case "FLOW":
                        return await this.sendTokenOffchainTransaction(payload);
                    case "CELO":
                        return await sendCeloOffchainTransaction(false, body as any);
                    case "TRON":
                        return await sendTronOffchainTransaction(false, body as any);
                    case "BNB":
                        return await this.sendTokenOffchainTransaction(body);
                    case "ETH":
                        return await this.sendOffchainTransactionFromCustodial(body);
                    case "BSC":
                        return await this.sendOffchainTransactionFromCustodial(body);
                    case "MATIC":
                        return await this.sendOffchainTransactionFromCustodial(body);
                    case "DOGE":
                        return await this.sendTokenOffchainTransaction(body);
                    default:
                        throw new Error(`Withdraws for ${body.token.symbol} are not supported at this moment.`);
                }
            };
            const withdrawTX = await callWithdrawMethod();
            await this.transferService.initTatumTransfer({
                txId: withdrawTX?.txId,
                symbol: data.token.symbol,
                network: data.token.network,
                amount: withdrawAbleAmount,
                action: TransferAction.WITHDRAW,
                walletId: data.userCurrency.walletId!,
                tatumId: data.address,
                status: TransferStatus.SUCCEEDED,
                type: TransferType.DEBIT,
            });

            if (this.isSubCustodialToken(data.token)) {
                try {
                    const transferData = await this.transferFunds({
                        senderAccountId: data.userCurrency.tatumId,
                        recipientAccountId: data.orgCurrency.tatumId,
                        amount: fee,
                        recipientNote: USER_WITHDRAW_FEE,
                    });
                    await this.transferService.initTatumTransfer({
                        txId: transferData?.reference,
                        symbol: data.token.symbol,
                        network: data.token.network,
                        amount: data.amount,
                        action: TransferAction.FEE,
                        walletId: data.orgCurrency.walletId!,
                        tatumId: data.orgCurrency.tatumId,
                        status: TransferStatus.SUCCEEDED,
                        type: TransferType.CREDIT,
                    });
                } catch (error) {
                    console.log(error);
                }
            }
            return withdrawTX;
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public async adjustWithdrawableAmount(data: WithdrawPayload): Promise<WithdrawFeeData> {
        let adjustedAmount = parseFloat(formatFloat(data.amount));
        const base = NETWORK_TO_NATIVE_TOKEN[data.token.network];
        let fee = await this.offchainEstimateFee(data);
        if (this.isSubCustodialToken(data.token)) {
            fee = await this.getFeeInSymbol(base, data.token.symbol, fee);
        }
        adjustedAmount = adjustedAmount - fee;
        return {
            withdrawAbleAmount: formatFloat(adjustedAmount),
            fee: formatFloat(fee),
        };
    }

    public async getFeeInSymbol(base: string, symbol: string, amount: number): Promise<number> {
        const marketRateSymbol = await this.marketDataService.getExchangeRateForCrypto(symbol);
        const marketRateBase = await this.marketDataService.getExchangeRateForCrypto(base);
        const BasetoSymbol = marketRateBase / marketRateSymbol;
        return BasetoSymbol * amount;
    }

    public generateWithdrawEndpoint(symbol: string) {
        return TOKEN_TO_WITHDRAW_ENDPOINT[symbol];
    }

    public async estimateLedgerToBlockchainFee(data: WithdrawPayload) {
        try {
            const wallet = await this.getWallet(data.token);
            const endpoint = `${this.baseUrl}/offchain/blockchain/estimate`;
            const requestData: RequestData = {
                method: "POST",
                url: endpoint,
                payload: {
                    senderAccountId: data.senderAccountId,
                    address: data.address,
                    amount: data.amount,
                    xpub: wallet?.xpub,
                },
                headers: { "x-api-key": Secrets.tatumApiKey },
            };
            const resp = await doFetch(requestData);
            return parseFloat(formatFloat(resp.fast));
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }

    public async estimateCustodialWithdrawFee(data: WithdrawPayload) {
        const endpoint = `${this.baseUrl}/blockchain/estimate`;
        const isSubCustodialToken = this.isSubCustodialToken(data.token);
        const wallet = await this.getWallet(data.token);
        const requestData: RequestData = {
            method: "POST",
            url: endpoint,
            payload: {
                chain: data.token.network,
                type: "TRANSFER_CUSTODIAL",
                amount: formatFloat(data.amount),
                sender: wallet.walletAddress,
                recipient: data.address,
                contractAddress: data.token.contractAddress,
                custodialAddress: data?.custodialAddress,
                tokenType: isSubCustodialToken ? 0 : 3,
            },
            headers: { "x-api-key": Secrets.tatumApiKey },
        };
        const resp = await doFetch(requestData);
        const feeAmount = (resp.gasLimit * resp.gasPrice) / 1e9;
        return parseFloat(formatFloat(feeAmount));
    }

    public async offchainEstimateFee(data: WithdrawPayload): Promise<number> {
        const chain = data.token.network;
        switch (chain) {
            case "BTC":
                return await this.estimateLedgerToBlockchainFee(data);
            case "XRP":
                return XRP_DEFAULT_WITHDRAW_FEE;
            case "BCH":
                return BCH_DEFAULT_WITHDRAW_FEE;
            case "LTC":
                return await this.estimateLedgerToBlockchainFee(data);
            case "FLOW":
                return await this.estimateLedgerToBlockchainFee(data);
            case "CELO":
                return await this.estimateLedgerToBlockchainFee(data);
            case "EGLD":
                return await this.estimateLedgerToBlockchainFee(data);
            case "TRON":
                return await this.estimateLedgerToBlockchainFee(data);
            case "ADA":
                return await this.estimateLedgerToBlockchainFee(data);
            case "BNB":
                return BNB_DEFAULT_WITHDRAW_FEE;
            case "DOGE":
                return await DOGE_DEFAULT_WITHDRAW_FEE;
            case "ETH":
                return await this.estimateCustodialWithdrawFee(data);
            case "BSC":
                return await this.estimateCustodialWithdrawFee(data);
            case "MATIC":
                return await this.estimateCustodialWithdrawFee(data);
            default:
                throw new Error("There was an error calculating withdraw fee.");
        }
    }

    public async removeAddressFromAccount(data: { accountId: string; address: string }) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            return await removeDepositAddress(data.accountId, data.address);
        } catch (error) {
            console.log(error?.response?.data || error.message);
            throw new Error(error?.response?.data?.message || error.message);
        }
    }
}
