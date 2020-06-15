import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { SocialClientCredentials } from '../types';
import { decrypt } from '../util/crypto';

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

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  public asClientCredentials(): SocialClientCredentials {
    const credentials: SocialClientCredentials = {};
    if (this.apiKey) credentials.apiKey = decrypt(this.apiKey);
    if (this.apiSecret) credentials.apiSecret = decrypt(this.apiSecret);
    return credentials;
  }
}