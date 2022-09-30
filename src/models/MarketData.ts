import { PrimaryGeneratedColumn, Entity, BaseEntity, CreateDateColumn, UpdateDateColumn, Column } from "typeorm";

@Entity()
export class MarketData extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public symbol: string;

    @Column({ nullable: false, default: 0, type: "float8" })
    public price: number;

    @Column({ nullable: true, default: 0 })
    public networkfee: number;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): MarketData {
        return {
            ...this,
        };
    }
}
