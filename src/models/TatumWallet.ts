import { PrimaryGeneratedColumn, Entity, BaseEntity, CreateDateColumn, UpdateDateColumn, Column } from "typeorm";

@Entity()
export class TatumWallet extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public currency: string;

    @Column({ nullable: false })
    public xpub: string;

    @Column({ nullable: false })
    public address: string;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): TatumWallet {
        return {
            ...this,
        };
    }

    public static async addTatumWallet(data: any): Promise<TatumWallet> {
        let account = new TatumWallet();
        account.currency = data.currency || "";
        account.xpub = data.xpub || "";
        account.address = data.address || "";
        return await TatumWallet.save(account);
    }
}
