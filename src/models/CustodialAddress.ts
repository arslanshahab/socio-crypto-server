import { CustodialAddressChain } from "src/types";
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
        if (!this.wallet) this.wallet = wallet;
        return await this.save();
    }

    public static async saveAddresses(list: string[], chain: CustodialAddressChain): Promise<CustodialAddress[]> {
        const addresses: CustodialAddress[] = [];
        list.forEach((item: string) => {
            const newAddress = new CustodialAddress();
            newAddress.address = item;
            newAddress.chain = chain;
            addresses.push(newAddress);
        });
        return await CustodialAddress.save(addresses);
    }
}
