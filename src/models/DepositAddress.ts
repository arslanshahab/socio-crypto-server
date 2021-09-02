import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { Admin } from "./Admin";

@Entity()
export class DepositAddress extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public currency: string;

    @Column({ nullable: false })
    public address: string;

    @ManyToOne((_type) => Admin, (admin) => admin.depositAddress)
    public admin: Admin;

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

    public static async addNewAddress(data: any, admin: Admin): Promise<DepositAddress> {
        let address = new DepositAddress();
        address.address = data.address;
        address.currency = data.currency;
        address.admin = admin;
        return await DepositAddress.save(address);
    }
}
