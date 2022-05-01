import { Prisma, Org, Wallet, Token, Currency } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { BadRequest } from "@tsed/exceptions";
import { PrismaService } from ".prisma/client/entities";
import { TatumClient } from "../clients/tatumClient";
import { SymbolNetworkParams } from "../types";
import { getCurrencyForTatum } from "../util/tatumHelper";

@Injectable()
export class AddressService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves the currency for the given symbol and network, if it's enabled
     *
     * @param data the currency to look up
     * @returns the currency if it's present & enabled, otherwise null
     */
    public async isCurrencySupported(data: SymbolNetworkParams) {
        return this.prismaService.token.findFirst({
            where: { symbol: data.symbol.toUpperCase(), network: data.network.toUpperCase(), enabled: true },
        });
    }

    /**
     * Adds a new account to the database
     *
     * @param data the account to add
     * @returns the added account
     */
    public async addAccount(data: {
        id: string;
        symbol: string;
        token: Token;
        wallet: Wallet;
        address?: string;
        memo?: string;
        message?: string;
        destinationTag?: number;
        derivationKey?: number;
    }) {
        let account: Prisma.CurrencyCreateInput = {
            tatumId: data.id,
            symbol: data.symbol,
            token: { connect: { id: data.token.id } },
            wallet: { connect: { id: data.wallet.id } },
        };
        if (data.address) account.depositAddress = data.address;
        if (data.memo) account.memo = data.memo;
        if (data.message) account.message = data.message;
        if (data.destinationTag) account.destinationTag = data.destinationTag;
        if (data.derivationKey) account.derivationKey = data.derivationKey;
        return this.prismaService.currency.create({ data: account });
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
        return this.prismaService.custodialAddress.create({ data: address });
    }

    /**
     * Updates the deposit address for the given currency
     *
     * @param currency the currency to update
     * @param address the new address
     * @returns the updated currency
     */
    public async updateDepositAddress(currency: Currency, address: string) {
        return this.prismaService.currency.update({
            where: { id: currency.id },
            data: { depositAddress: address },
        });
    }

    /**
     * Retrieves the first available custodial address for the given currency and wallet
     * Creates a new address if none are available
     *
     * @param data the currency to look up
     * @param wallet the wallet to use if possible
     * @returns the first available custodial address
     */
    public async getAvailableAddress(data: { symbol: string; network: string }, wallet: Wallet) {
        let found = await this.prismaService.custodialAddress.findFirst({
            where: { chain: data.network, walletId: wallet.id },
        });
        if (!found) {
            found = await this.prismaService.custodialAddress.findFirst({
                where: { chain: data.network, available: true },
            });
        }
        if (!found) {
            const newAddress = await TatumClient.generateCustodialAddress(data);
            found = await this.saveAddress({ address: newAddress, network: data.network, wallet });
        }
        return found;
    }

    /**
     * Retrieves a currency object for the given currency and wallet, creating a one if necessary
     *
     * @param data the currency to look up
     * @param wallet the wallet to use if possible
     * @returns the currency object
     */
    public async findOrCreateCurrency(data: SymbolNetworkParams, wallet: Wallet & { org: Org | null }) {
        const token = await this.isCurrencySupported(data);
        if (!token) throw new BadRequest(`Currency ${data.symbol} is not supported.`);
        let ledgerAccount = await this.prismaService.currency.findFirst({
            where: { walletId: wallet.id, tokenId: token.id },
        });
        let newDepositAddress;
        if (!ledgerAccount) {
            const isCustodial = TatumClient.isCustodialWallet(data);
            const newLedgerAccount = await TatumClient.createLedgerAccount({ ...data, isCustodial });
            if (isCustodial) {
                if (wallet.org) {
                    const availableAddress = await this.getAvailableAddress(data, wallet);
                    if (!availableAddress) throw new Error("No custodial address available.");
                    await TatumClient.assignAddressToAccount({
                        accountId: newLedgerAccount.id,
                        address: availableAddress.address,
                    });
                    newDepositAddress = availableAddress;
                }
            } else {
                newDepositAddress = await TatumClient.generateDepositAddress(newLedgerAccount.id);
            }
            ledgerAccount = await this.addAccount({
                ...newLedgerAccount,
                token,
                symbol: getCurrencyForTatum(data),
                ...(newDepositAddress && { address: newDepositAddress.address }),
                wallet,
            });
        }
        return ledgerAccount;
    }
}
