import { CustodialAddressChain } from "src/types";
import { PrimaryGeneratedColumn, Entity, BaseEntity, CreateDateColumn, UpdateDateColumn, Column } from "typeorm";

@Entity()
export class CustodialAddress extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public chain: CustodialAddressChain;

    @Column({ nullable: false, default: true })
    public available: boolean;

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

    public static async saveAddresses(list: string[], chain: CustodialAddressChain): Promise<CustodialAddress[]> {
        const addresses: CustodialAddress[] = [];
        list.forEach((item: string) => {
            const newAddress = new CustodialAddress();
            newAddress.address = item;
            newAddress.chain = chain;
            addresses.push(newAddress);
        });
        return await CustodialAddress.save(addresses);
    }
}
