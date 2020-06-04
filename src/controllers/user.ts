import {Campaign} from "../models/Campaign";
import {Participant} from "../models/Participant";
import {checkPermissions} from "../middleware/authentication";
import {Firebase} from "../clients/firebase";
import {User} from "../models/User";
import {Wallet} from "../models/Wallet";
import { TinyUrl } from '../clients/tinyUrl';

export const participate = async (args: { campaignId: string }, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOne({ where: { id }, relations: ['campaigns', 'wallet'] });
    if (!user) throw new Error('user not found');
    const campaign = await Campaign.findOne({ where: { id: args.campaignId } });
    if (!campaign) throw new Error('campaign not found');
    if (!campaign.isOpen()) throw new Error('campaign is not open for participation');
    if (await Participant.findOne({ where: { campaign, user } })) throw new Error('user already participating in this campaign');
    const participant = Participant.newParticipant(user, campaign);
    await participant.save();
    participant.link = await TinyUrl.shorten(`${campaign.target}?referrer=${participant.id}`);
    await participant.save();
    return participant;
};

export const promotePermissions = async (args: { userId: string, email: string, company: string, role: 'admin'|'manager' }, context: { user: any }) => {
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

export const removeParticipation = async (args: { campaignId: string }, context: { user: any }) => {
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

export const usernameExists = async (args: { username: string }) => {
    const participant = await User.findOne({ where: { username: args.username } });
    return { exists: !!participant };
}

export const signUp = async (args: { username: string, deviceToken: string }, context: { user: any }) => {
    const {deviceToken} = args;
    const { id, email } = context.user;
    if (await User.findOne({ where: { id } })) throw new Error('user already registered');
    const user = new User();
    const wallet = new Wallet();
    user.id = id;
    user.email = email;
    user.deviceToken = deviceToken;
    await user.save();
    wallet.user = user;
    await wallet.save();
    return user;
}

export const me = async (_args: any, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOne({ where: { id }, relations: ['campaigns', 'wallet', 'socialLinks','factorLinks','twentyFourHourMetrics'] });
    if (!user) throw new Error('user not found');
    return user;
}

export const list = async (args: { skip: number, take: number }, context: { user: any }) => {
    checkPermissions({ hasRole: ['admin'] }, context);
    const { skip = 0, take = 10 } = args;
    const [results, total] = await User.findAndCount({ skip, take });
    return { results, total };
}

export const setDevice = async (args: { deviceToken: string }, context: { user: any }) => {
  const { deviceToken } = args;
  const user = await me(undefined, context);
  user.deviceToken = deviceToken;
  await user.save();
  return true;
}

export const updateUsername = async (args: { username: string }, context: { user: any }) => {
  const user = await me(undefined, context);
  if (await User.findOne({ where: { username: args.username } })) throw new Error('username is already registered');
  user.username = args.username;
  await user.save();
  return user;
}
