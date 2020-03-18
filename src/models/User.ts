import { BaseEntity, Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { Participant } from './Participant';
import { Campaign } from './Campaign';

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
    if (await User.findOne({ where: { id: args.id } })) throw new Error('user already registered');
    const user = new User();
    user.id = args.id;
    user.email = args.email;
    await user.save();
    return user;
  }

  public static async me(args: { id: string }): Promise<User> {
    const user = await User.findOne({ where: { id: args.id }, relations: ['campaigns'] });
    if (!user) throw new Error('user not found');
    return user;
  }

  public static async participate(args: { campaignId: string, userId: string }): Promise<User> {
    const user = await User.findOne({ where: { id: args.userId }, relations: ['campaigns'] });
    if (!user) throw new Error('user not found');
    const campaign = await Campaign.findOne({ where: { id: args.campaignId } });
    if (!campaign) throw new Error('campaign not found');
    if (await Participant.findOne({ where: { campaign, user } })) throw new Error('user already participating in this campaign');
    const participant = Participant.newParticipant(user, campaign);
    await participant.save();
    user.campaigns = [...user.campaigns, participant];
    return user;
  }

  public static async removeParticipation(args: { campaignId: string, userId: string }): Promise<User> {
    const user = await User.findOne({ where: { id: args.userId }, relations: ['campaigns'] });
    if (!user) throw new Error('user not found');
    const campaign = await Campaign.findOne({ where: { id: args.campaignId } });
    if (!campaign) throw new Error('campaign not found');
    const participation = await Participant.findOne({ where: { user, campaign } });
    if (!participation) throw new Error('user was not participating in campaign');
    await participation.remove();
    return user;
  }
}