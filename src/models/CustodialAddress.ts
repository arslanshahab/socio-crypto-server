import { TatumClient } from "../clients/tatumClient";
import { CustodialAddressChain } from "types";
import {
    PrimaryGeneratedColumn,
    Entity,
    BaseEntity,
    CreateDateColumn,
    UpdateDateColumn,
    Column,
    ManyToOne,
} from "typeorm";
import { Wallet } from "./Wallet";

@Entity()
export class CustodialAddress extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public chain: CustodialAddressChain;

    @Column({ nullable: false, default: true })
    public available: boolean;

    @Column({ nullable: false })
    public address: string;

    @ManyToOne((_type) => Wallet, (wallet) => wallet.custodialAddress)
    public wallet: Wallet;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): CustodialAddress {
        return {
            ...this,
        };
    }

    public async changeAvailability(flag: boolean) {
        this.available = flag;
        return await this.save();
    }

    public async assignWallet(wallet: Wallet) {
        if (!this.wallet) {
            this.wallet = wallet;
            this.available = false;
        }
        return await this.save();
    }

    public static saveAddress = async (data: { address: string; network: CustodialAddressChain; wallet?: Wallet }) => {
        const address = new CustodialAddress();
        address.address = data.address;
        address.chain = data.network;
        if (data.wallet) {
            address.wallet = data.wallet;
            address.available = false;
        }
        return await address.save();
    };

    public static getAvailableAddress = async (data: { symbol: string; network: string; wallet: Wallet }) => {
        let found = await CustodialAddress.findOne({ where: { chain: data.network, wallet: data.wallet } });
        if (!found) {
            found = await CustodialAddress.findOne({ where: { chain: data.network, available: true } });
        }
        if (!found) {
            const newaAddress = await TatumClient.generateCustodialAddress(data);
            found = await CustodialAddress.saveAddress({
                address: newaAddress,
                network: data.network as CustodialAddressChain,
                wallet: data.wallet,
            });
        }
        return found;
    };
}
