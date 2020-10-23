import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class NotificationSettings extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'boolean', default: true })
  public kyc: boolean;

  @Column({ type: 'boolean', default: true })
  public withdraw: boolean;

  @Column({ type: 'boolean', default: true })
  public campaignCreate: boolean;

  @Column({ type: 'boolean', default: true })
  public campaignUpdates: boolean;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @OneToOne(
    _type => User,
    user => user.notificationSettings
  )
  @JoinColumn()
  public user: User;
}