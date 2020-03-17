import { BaseEntity, Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Participant } from './Participant';

enum Algorithms {
  PUBLIC_BLOCKCHAIN = "publicBlockchain"
}

@Entity()
export class Campaign extends BaseEntity {
  @PrimaryColumn()
  public id: string;

  @Column({ type: 'timestamptz' })
  public beginDate: Date;

  @Column({ type: 'timestamptz' })
  public endDate: Date;

  @Column({ type: 'numeric' })
  public coiinTotal: number;

  @Column()
  public target: string;

  @Column()
  public algorithm: Algorithms;


  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Participant,
    participant => participant.campaignId,
  )
  public participants: Participant[];
}