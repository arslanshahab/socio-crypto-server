import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import {BigNumberEntityTransformer} from "../util/transformers";
import BigNumber from "bignumber.js";
import {FundingWallet} from "./FundingWallet";
import {Campaign} from "./Campaign";


@Entity()
export class Escrow extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'varchar', nullable: false, transformer: BigNumberEntityTransformer })
  public amount: BigNumber;

  @ManyToOne(
    _type => FundingWallet,
    wallet => wallet.escrows
  )
  public fundingWallet: FundingWallet;

  @OneToOne(
    _type => Campaign,
    campaign => campaign.escrow
  )
  @JoinColumn()
  public campaign: Campaign;

  public static newCampaignEscrow(campaign: Campaign, fundingWallet: FundingWallet) {
    const escrow = new Escrow();
    escrow.campaign = campaign;
    escrow.fundingWallet = fundingWallet;
    escrow.amount = campaign.coiinTotal;
    return escrow;
  }
}
