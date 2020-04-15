import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity()
export class SocialLink extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public type: string;

  @Column({ nullable: true })
  public apiKey: string;

  @Column({ nullable: true })
  public apiSecret: string;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => User,
    user => user.socialLinks,
  )
  public user: User;
}