import { ParticipantAction, SocialClientType, TransactionChainType, TransactionType } from "../util/constants";
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
} from "typeorm";
import { Campaign } from "./Campaign";

@Entity()
export class Transaction extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public tag: string;

    @Column({ nullable: false })
    public txId: string;

    @Column({ nullable: true })
    public signature: string;

    @Column({ nullable: false })
    public chain: TransactionChainType;

    @Column({ nullable: true })
    public action: ParticipantAction;

    @Column({ nullable: true })
    public socialType: SocialClientType;

    @Column({ nullable: false })
    public transactionType: TransactionType;

    @Column({ nullable: true })
    public participantId: string;

    @ManyToOne((_type) => Campaign, (campaign) => campaign.participants, { nullable: true })
    public campaign: Campaign;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;
}
