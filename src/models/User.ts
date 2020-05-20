import { BaseEntity, Entity, PrimaryColumn, Column, OneToMany, OneToOne } from 'typeorm';
import { Participant } from './Participant';
import { Wallet } from './Wallet';
import { SocialLink } from './SocialLink';
import {SocialPost} from "./SocialPost";
import { FactorLink } from './FactorLink';

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn()
  public id: string;

  @Column({ nullable: true })
  public email: string;

  @Column({ nullable: true })
  public deviceToken: string;

  @OneToMany(
      _type => SocialPost,
      posts => posts.user
  )
  posts: SocialPost[];

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Participant,
    participant => participant.user,
  )
  campaigns: Participant[];

  @OneToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Wallet,
    wallet => wallet.user,
  )
  public wallet: Wallet;

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => SocialLink,
    link => link.user,
  )
  public socialLinks: SocialLink[];

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => FactorLink,
    link => link.user,
  )
  public factorLinks: FactorLink[];
}
