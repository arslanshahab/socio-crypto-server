import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { NftName, NftType } from "../util/constants";

@Entity()
export class Nft extends BaseEntity {
    @Column({ nullable: false, unique: true, primary: true })
    public nftId: string;

    @Column({ nullable: false })
    public type: NftType;

    @Column({ nullable: false })
    public name: NftName;

    @Column({ nullable: true, type: "jsonb", unique: true })
    public transactions: JSON;

    @ManyToOne((_type) => User, (user) => user.nfts)
    public user: User;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;
}
