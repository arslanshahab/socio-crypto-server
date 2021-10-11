import { PrimaryGeneratedColumn, Entity, BaseEntity, CreateDateColumn, UpdateDateColumn, Column } from "typeorm";

@Entity()
export class TatumAccount extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public accountId: string;

    @Column({ nullable: false })
    public currency: string;

    @Column({ nullable: false })
    public accountingCurrency: string;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): TatumAccount {
        return {
            ...this,
        };
    }

    public static async addAccount(data: any): Promise<TatumAccount> {
        let account = new TatumAccount();
        account.accountId = data.id;
        account.currency = data.currency;
        account.accountingCurrency = data.accountingCurrency;
        return await TatumAccount.save(account);
    }
}
