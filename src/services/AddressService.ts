import { Prisma, Wallet } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { TatumClient } from "../clients/tatumClient";

@Injectable()
export class AddressService {
    @Inject()
    private prismaService: PrismaService;

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
}
