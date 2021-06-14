import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { Campaign } from "./Campaign";
import { CryptoTransaction } from "./CryptoTransaction";

@Entity()
export class CryptoCurrency extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false, unique: true })
    public type: string;

    @Column({ nullable: true, unique: true })
    public contractAddress: string;

    @OneToMany((_type) => Campaign, (campaign) => campaign.crypto)
    public campaigns: Campaign[];

    @OneToMany((_type) => CryptoTransaction, (transactions) => transactions.crypto)
    public missedTransfers: CryptoTransaction[];

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): CryptoCurrency {
        return {
            ...this,
            campaigns: this.campaigns ? this.campaigns.map((campaign) => campaign.asV1()) : [],
            missedTransfers: this.missedTransfers ? this.missedTransfers.map((transfer) => transfer.asV1()) : [],
        };
    }

    public static newCryptoCurrency(type: string, contractAddress: string) {
        const cryptoCurrency = new CryptoCurrency();
        cryptoCurrency.type = type.toLowerCase();
        cryptoCurrency.contractAddress = contractAddress.toLowerCase();
        return cryptoCurrency;
    }
}
