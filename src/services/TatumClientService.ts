import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { CustodialAddressPayload, SymbolNetworkParams } from "../types";
import { RequestData } from "../util/fetchRequest";
import { Secrets } from "../util/secrets";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { Wallet } from "@prisma/client";
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
    storeTransaction,
} from "@tatumio/tatum";
import { CUSTODIAL_NETWORKS } from "../util/constants";
import { TokenService } from "./TokenService";
import { TatumWalletService } from "./TatumWalletService";
import { CurrencyService } from "./CurrencyService";
import { WalletService } from "./WalletService";

@Injectable()
export class TatumClientService {
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private tokenService: TokenService;
    @Inject()
    private tatumWalletService: TatumWalletService;
    @Inject()
    private currenyService: CurrencyService;
    @Inject()
    private walletService: WalletService;

    public baseUrl = "https://api-eu1.tatum.io/v3";

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

    // Find supported currency
    public async isCurrencySupported(data: SymbolNetworkParams) {
        try {
            return await this.tokenService.findToken(data);
        } catch (error) {
            throw new BadRequest(error.message);
        }
    }
    // Verify deposit address
    public isCustodialWallet(data: SymbolNetworkParams) {
        try {
            return CUSTODIAL_NETWORKS.includes(data.network);
        } catch (error) {
            console.log(error);
            throw new BadRequest(error.message);
        }
    }

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
    public async createLedgerAccount(data: { symbol: string; network: string; isCustodial: boolean }) {
        try {
            process.env["TATUM_API_KEY"] = Secrets.tatumApiKey;
            let { symbol, isCustodial } = data;
            const wallet = await this.getWallet({ symbol: data.symbol, network: data.network });
            symbol = getCurrencyForTatum(data);
            return await createAccount({
                currency: symbol,
                ...(!isCustodial && { xpub: wallet?.xpub || wallet?.address }),
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

    // Get available address
    public async getAvailableAddress(data: SymbolNetworkParams & { wallet: Wallet }) {
        let found = await this.prismaService.custodialAddress.findFirst({
            where: { chain: data.network, walletId: data.wallet.id },
        });
        if (!found) {
            found = await this.prismaService.custodialAddress.findFirst({
                where: { chain: data.network, available: true },
            });
        }
        if (!found) {
            const newAddress = await this.generateCustodialAddress(data);
            let custodialData = data.wallet
                ? {
                      address: newAddress,
                      chain: data.network,
                      walletId: data.wallet.id,
                      available: false,
                  }
                : { address: newAddress, chain: data.network };
            found = await this.prismaService.custodialAddress.create({
                data: custodialData,
            });
        }
        return found;
    }

    // Find or create currency
    public async findOrCreateCurrency(data: SymbolNetworkParams & { wallet: Wallet }) {
        const token = await this.isCurrencySupported(data);
        if (!token) throw new NotFound("No token found.");
        const foundWallet = await this.walletService.findWalletById(data.wallet.id);
        if (!foundWallet) throw new NotFound("Wallet not found");
        const isCustodial = this.isCustodialWallet(data);
        let ledgerAccount = await this.currenyService.findLedgerAccount(data.wallet.id, token.id);
        let newDepositAddress;
        if (!ledgerAccount) {
            const newLedgerAccount = await this.createLedgerAccount({ ...data, isCustodial });
            if (isCustodial) {
                if (foundWallet.org) {
                    const availableAddress = await this.getAvailableAddress(data);
                    if (!availableAddress) throw new NotFound("No custodial address available.");
                    await this.assignAddressToAccount({
                        accountId: newLedgerAccount.id,
                        address: availableAddress.address,
                    });
                    newDepositAddress = availableAddress;
                }
            } else {
                newDepositAddress = await this.generateDepositAddress(newLedgerAccount.id);
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
    public async trnasferFunds(data: {
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
}
