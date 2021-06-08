import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { BigNumberEntityTransformer } from "../util/transformers";
import BigNumber from "bignumber.js";
import { Campaign } from "./Campaign";
import { Wallet } from "./Wallet";

@Entity()
export class Escrow extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({
        type: "varchar",
        nullable: false,
        transformer: BigNumberEntityTransformer,
    })
    public amount: BigNumber;

    @ManyToOne((_type) => Wallet, (wallet) => wallet.escrows)
    public wallet: Wallet;

    @OneToOne((_type) => Campaign, (campaign) => campaign.escrow)
    @JoinColumn()
    public campaign: Campaign;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public static newCampaignEscrow(campaign: Campaign, wallet: Wallet) {
        const escrow = new Escrow();
        escrow.campaign = campaign;
        escrow.wallet = wallet;
        escrow.amount = campaign.coiinTotal;
        return escrow;
    }
}
