import { BaseEntity, Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { Participant } from './Participant';

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn()
  public id: string;

  @Column({ nullable: false })
  public email: string;

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Participant,
    participant => participant.user,
  )
  campaigns: Participant[];

  public static async signUp(args: { id: string, email: string }): Promise<User> {
    const user = new User();
    user.id = args.id;
    user.email = args.email;
    await user.save();
    return user;
  }

  public static async me(args: { id: string }): Promise<User> {
    const user = await User.findOne({ where: { id: args.id } });
    if (!user) throw new Error('user not found');
    return user;
  }
}