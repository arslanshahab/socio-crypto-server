import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { Org } from "./Org";

@Entity()
export class DepositAddress extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public currency: string;

    @Column({ nullable: false })
    public address: string;

    @ManyToOne((_type) => Org, (org) => org.depositAddress)
    public org: Org;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1() {
        const returnValue: DepositAddress = {
            ...this,
        };
        return returnValue;
    }

    public static async addNewAddress(data: any, org: Org): Promise<DepositAddress> {
        let address = new DepositAddress();
        address.address = data.address;
        address.currency = data.currency;
        address.org = org;
        return await DepositAddress.save(address);
    }
}
