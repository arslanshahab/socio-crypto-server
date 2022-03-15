import {
    PrimaryGeneratedColumn,
    Entity,
    BaseEntity,
    CreateDateColumn,
    UpdateDateColumn,
    Column,
    ManyToOne,
    OneToMany,
} from "typeorm";
import { Wallet } from "./Wallet";
import { Token } from "./Token";
import { Campaign } from "./Campaign";

@Entity()
export class Currency extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public tatumId: string; //tatum account Id

    @Column({ nullable: false })
    public symbol: string;

    @Column({ nullable: true })
    public depositAddress: string;

    @Column({ nullable: true })
    public memo: string;

    @Column({ nullable: true })
    public message: string;

    @Column({ nullable: true })
    public destinationTag: number;

    @Column({ nullable: true })
    public derivationKey: number;

    @OneToMany((_type) => Campaign, (campaign) => campaign.currency)
    public campaign: Campaign[];

    @ManyToOne((_type) => Wallet, (wallet) => wallet.currency)
    public wallet: Wallet;

    @ManyToOne((_type) => Token, (token) => token.currency)
    public token: Token;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): Currency {
        return {
            ...this,
        };
    }

    public static async addAccount(data: any): Promise<Currency> {
        let account = new Currency();
        account.tatumId = data.id;
        account.symbol = data.currency;
        account.wallet = data.wallet;
        if (data.address) account.depositAddress = data.address;
        if (data.memo) account.memo = data.memo;
        if (data.message) account.message = data.message;
        if (data.destinationTag) account.destinationTag = data.destinationTag;
        if (data.derivationKey) account.derivationKey = data.derivationKey;
        return await Currency.save(account);
    }
}
