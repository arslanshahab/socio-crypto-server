import {
    PrimaryGeneratedColumn,
    Entity,
    BaseEntity,
    CreateDateColumn,
    UpdateDateColumn,
    Column,
    ManyToOne,
} from "typeorm";
import { Org } from "./Org";
import { User } from "./User";

@Entity()
export class TatumAccount extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public accountId: string;

    @Column({ nullable: false })
    public currency: string;

    @Column({ nullable: false })
    public address: string;

    @Column({ nullable: true })
    public memo: string;

    @Column({ nullable: true })
    public message: string;

    @Column({ nullable: true })
    public destinationTag: number;

    @ManyToOne((_type) => Org, (org) => org.tatumAccounts)
    public org: Org;

    @ManyToOne((_type) => User, (user) => user.tatumAccounts)
    public user: User;

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
        console.log(data);
        let account = new TatumAccount();
        account.accountId = data.id;
        account.currency = data.currency;
        account.address = data.address;
        if (data.memo) account.memo = data.memo;
        if (data.message) account.message = data.message;
        if (data.destinationTag) account.destinationTag = data.destinationTag;
        if (data.org) account.org = data.org;
        return await TatumAccount.save(account);
    }
}
