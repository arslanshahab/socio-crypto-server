import {
    Entity,
    BaseEntity,
    Column,
    PrimaryGeneratedColumn,
    OneToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    OneToMany,
} from "typeorm";
import { Campaign } from "./Campaign";
import { Transfer } from "./Transfer";
import { RafflePrizeStructure } from "types";

@Entity()
export class RafflePrize extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column()
    public displayName: string;

    @Column({ nullable: true })
    public image: boolean;

    @Column({ nullable: true })
    public affiliateLink: string;

    @UpdateDateColumn()
    public updatedAt: Date;

    @CreateDateColumn()
    public createdAt: Date;

    @OneToOne((_type) => Campaign, (campaign) => campaign.prize)
    @JoinColumn()
    public campaign: Campaign;

    @OneToMany((_type) => Transfer, (transfer) => transfer.rafflePrize)
    public transfers: Transfer[];

    public static newFromCampaignCreate(campaign: Campaign, prize: RafflePrizeStructure) {
        const rafflePrize = new RafflePrize();
        rafflePrize.campaign = campaign;
        rafflePrize.displayName = prize.displayName;
        if (prize.affiliateLink) rafflePrize.affiliateLink = prize.affiliateLink;
        if (prize.image) rafflePrize.image = true;
        return rafflePrize;
    }
}
