import { ParticipantAction, SocialClientType, TransactionChainType, TransactionType } from "../util/constants";
import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Transaction extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public tag: string;

    @Column({ nullable: false })
    public txId: string;

    @Column({ nullable: false })
    public chain: TransactionChainType;

    @Column({ nullable: true })
    public action: ParticipantAction;

    @Column({ nullable: false })
    public socialType: SocialClientType;

    @Column({ nullable: false })
    public transactionType: TransactionType;

    @Column({ nullable: false })
    public participantId: string;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;
}
