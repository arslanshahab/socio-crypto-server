import { BaseEntity, Entity, PrimaryColumn, Column, OneToMany, OneToOne } from 'typeorm';
import { encrypt } from '../util/crypto';
import { Participant } from './Participant';
import { Campaign } from './Campaign';
import { Wallet } from './Wallet';
import { Firebase } from '../clients/firebase';
import { checkPermissions } from '../middleware/authentication';
import { SocialLink } from './SocialLink';

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn()
  public id: string;

  @Column({ nullable: false })
  public email: string;

  @Column({ nullable: false, unique: true })
  public username: string;

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

  public static async usernameExists(args: { username: string }) {
    const user = await User.findOne({ where: { username: args.username } });
    return { exists: !!user };
  }

  public static async signUp(args: { username: string }, context: { user: any }): Promise<User> {
    const { id, email } = context.user;
    if (await User.findOne({ where: { id } })) throw new Error('user already registered');
    const user = new User();
    const wallet = new Wallet();
    user.id = id;
    user.email = email;
    user.username = args.username;
    await user.save();
    wallet.user = user;
    await wallet.save();
    return user;
  }

  public static async me(_args: any, context: { user: any }): Promise<User> {
    const { id } = context.user;
    const user = await User.findOne({ where: { id }, relations: ['campaigns', 'wallet', 'socialLinks'] });
    if (!user) throw new Error('user not found');
    return user;
  }

  public static async registerSocialLink(args: { type: string, apiKey: string, apiSecret: string }, context: { user: any }): Promise<Boolean> {
    const user = await User.me(undefined, context);
    const { type, apiKey, apiSecret } = args;
    if (!['twitter','facebook'].includes(type)) throw new Error('the type must exist as a predefined type');
    const existingLink = user.socialLinks.find(link => link.type === type);
    const encryptedApiKey = encrypt(apiKey);
    const encryptedApiSecret = encrypt(apiSecret);
    if (existingLink) {
      existingLink.apiKey = encryptedApiKey;
      existingLink.apiSecret = encryptedApiSecret;
      await existingLink.save();
    } else {
      const link = new SocialLink();
      link.type = type;
      link.apiKey = encryptedApiKey;
      link.apiSecret = encryptedApiSecret;
      link.user = user;
      await link.save();
    }
    return true;
  }

  public static async participate(args: { campaignId: string }, context: { user: any }): Promise<Participant> {
    const { id } = context.user;
    const user = await User.findOne({ where: { id }, relations: ['campaigns', 'wallet'] });
    if (!user) throw new Error('user not found');
    const campaign = await Campaign.findOne({ where: { id: args.campaignId } });
    if (!campaign) throw new Error('campaign not found');
    if (!campaign.isOpen()) throw new Error('campaign is not open for participation');
    if (await Participant.findOne({ where: { campaign, user } })) throw new Error('user already participating in this campaign');
    const participant = Participant.newParticipant(user, campaign);
    await participant.save();
    return participant;
  }

  public static async removeParticipation(args: { campaignId: string }, context: { user: any }): Promise<User> {
    const { id } = context.user;
    const user = await User.findOne({ where: { id }, relations: ['campaigns', 'wallet'] });
    if (!user) throw new Error('user not found');
    const campaign = await Campaign.findOne({ where: { id: args.campaignId } });
    if (!campaign) throw new Error('campaign not found');
    const participation = await Participant.findOne({ where: { user, campaign } });
    if (!participation) throw new Error('user was not participating in campaign');
    await participation.remove();
    return user;
  }

  public static async promotePermissions(args: { userId: string, email: string, company: string, role: 'admin'|'manager' }, context: { user: any }): Promise<User> {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const where: {[key: string]: string} = {};
    if (args.userId) where['id'] = args.userId;
    else if (args.email) where['email'] = args.email;
    else throw new Error('Either userId or email must be provided');
    const user = await User.findOne({ where });
    if (!user) throw new Error('user not found');
    if (role === 'manager') {
      await Firebase.client.auth().setCustomUserClaims(user.id, { role: 'manager', company });
    } else {
      if (!args.role) throw new Error('administrators must specify a role to promote user to');
      await Firebase.client.auth().setCustomUserClaims(user.id, { role: args.role, company: args.company || company });
    }
    return user;
  }

  public static async list(args: { skip: number, take: number }, context: { user: any }): Promise<{ results: User[], total: number }> {
    checkPermissions({ hasRole: ['admin'] }, context);
    const { skip = 0, take = 10 } = args;
    const [results, total] = await User.findAndCount({ skip, take });
    return { results, total };
  }
}