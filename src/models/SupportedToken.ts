import {
    PrimaryGeneratedColumn,
    Entity,
    BaseEntity,
    CreateDateColumn,
    UpdateDateColumn,
    Column,
    OneToMany,
} from "typeorm";
import { Currency } from "./Currency";

@Entity()
export class SupportedToken extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public symbol: string;

    @Column({ nullable: false })
    public network: string;

    @Column({ nullable: true })
    public contractAddress: string;

    @Column({ nullable: false, default: true })
    public enabled: boolean;

    @OneToMany((_type) => Currency, (currency) => currency.token)
    public currency: Currency[];

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): SupportedToken {
        return {
            ...this,
        };
    }

    public static async addSupportedCurrency(data: {
        symbol: string;
        network: string;
        contractAddress: string;
    }): Promise<SupportedToken> {
        const newSupportedCurrency = new SupportedToken();
        newSupportedCurrency.symbol = data.symbol;
        newSupportedCurrency.network = data.network;
        newSupportedCurrency.contractAddress = data.contractAddress;
        return await SupportedToken.save(newSupportedCurrency);
    }
}
