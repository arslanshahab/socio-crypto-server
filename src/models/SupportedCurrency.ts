import { PrimaryGeneratedColumn, Entity, BaseEntity, CreateDateColumn, UpdateDateColumn, Column } from "typeorm";

@Entity()
export class SupportedCurrency extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public symbol: string;

    @Column({ nullable: false })
    public network: string;

    @Column({ nullable: false, default: "0x0000000000000000000000000000000000000000" })
    public contractAddress: string;

    @Column({ nullable: false, default: true })
    public enabled: boolean;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): SupportedCurrency {
        return {
            ...this,
        };
    }

    public static async addSupportedCurrency(data: {
        symbol: string;
        network: string;
        contractAddress: string;
    }): Promise<SupportedCurrency> {
        let newSupportedCurrency = new SupportedCurrency();
        newSupportedCurrency.symbol = data.symbol;
        newSupportedCurrency.network = data.network;
        newSupportedCurrency.contractAddress = data.contractAddress;
        return await SupportedCurrency.save(newSupportedCurrency);
    }
}
