import { PrimaryGeneratedColumn, Entity, BaseEntity, CreateDateColumn, UpdateDateColumn, Column } from "typeorm";

@Entity()
export class CustodialAddress extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public chain: string;

    @Column({ nullable: false })
    public free: boolean;

    @Column({ nullable: false })
    public address: string;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): CustodialAddress {
        return {
            ...this,
        };
    }

    public static async addTatumWallet(data: any): Promise<CustodialAddress> {
        let account = new CustodialAddress();
        account.free = true;
        account.chain = data.currency || "";
        account.address = data.address || "";
        return await CustodialAddress.save(account);
    }
}
