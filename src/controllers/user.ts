import {Campaign} from "../models/Campaign";
import {Participant} from "../models/Participant";
import {checkPermissions} from "../middleware/authentication";
import {Firebase} from "../clients/firebase";
import {User} from "../models/User";
import { TinyUrl } from '../clients/tinyUrl';
import {sha256Hash} from '../util/crypto';
import { GraphQLResolveInfo } from 'graphql';
import { Profile } from '../models/Profile';

export const participate = async (args: { campaignId: string }, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOne({ where: { identityId: id }, relations: ['campaigns', 'wallet'] });
    if (!user) throw new Error('user not found');
    const campaign = await Campaign.findOne({ where: { id: args.campaignId } });
    if (!campaign) throw new Error('campaign not found');
    if (!campaign.isOpen()) throw new Error('campaign is not open for participation');
    if (await Participant.findOne({ where: { campaign, user } })) throw new Error('user already participating in this campaign');
    const participant = Participant.newParticipant(user, campaign);
    await participant.save();
    const url = `${campaign.target}${campaign.target.endsWith('/') ? '' : '/'}?referrer=${participant.id}`;
    participant.link = await TinyUrl.shorten(url);
    await participant.save();
    return participant.asV1();
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
    return user.asV1();
}

export const removeParticipation = async (args: { campaignId: string }, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOne({ where: { identityId: id }, relations: ['campaigns', 'wallet'] });
    if (!user) throw new Error('user not found');
    const campaign = await Campaign.findOne({ where: { id: args.campaignId } });
    if (!campaign) throw new Error('campaign not found');
    const participation = await Participant.findOne({ where: { user, campaign } });
    if (!participation) throw new Error('user was not participating in campaign');
    await participation.remove();
    return user.asV1();
}

export const usernameExists = async (args: { username: string }) => {
    const profile = await Profile.findOne({ where: { username: args.username } });
    return { exists: !!profile };
}

export const accountExists = async (args: { id: string }) => {
    const user = await User.findOne({ identityId: args.id });
    return { exists: !!user };
}

export const me = async (args: { openCampaigns?: boolean } = {}, context: { user: any }, info: GraphQLResolveInfo) => {
    const { id } = context.user;
    const query = info.fieldNodes.find(field => field.name.value === info.fieldName);
    const user = await User.getUser(id, query);
    if (!user) throw new Error('user not found');
    if (args.openCampaigns !== null && args.openCampaigns === true) {
      user.campaigns = user.campaigns.filter(p => p.campaign.isOpen());
    } else if (args.openCampaigns !== null && args.openCampaigns === false) {
      user.campaigns = user.campaigns.filter(p => !p.campaign.isOpen());
    }
    return user.asV1();
}

export const list = async (args: { skip: number, take: number }, context: { user: any }) => {
    checkPermissions({ hasRole: ['admin'] }, context);
    const { skip = 0, take = 10 } = args;
    const [results, total] = await User.findAndCount({ skip, take });
    return { results: results.map(user => user.asV1()), total };
}

export const setDevice = async (args: { deviceToken: string }, context: { user: any }) => {
  const { deviceToken } = args;
  const { id } = context.user;
  const user = await User.findOneOrFail({ where: { identityId: id } });
  user.profile.deviceToken = deviceToken;
  await user.profile.save();
  return true;
}

export const updateUsername = async (args: { username: string }, context: { user: any }) => {
  const { id } = context.user;
  const user = await User.findOneOrFail({ where: { identityId: id } });
  if (await Profile.findOne({ where: { username: args.username } })) throw new Error('username is already registered');
  user.profile.username = args.username;
  await user.profile.save();
  return user.asV1();
}

export const setRecoveryCode = async (args: { code: number }, context: { user: any }) => {
  const { id } = context.user;
  const user = await User.findOneOrFail({ where: { identityId: id } });
  user.profile.recoveryCode = sha256Hash(args.code.toString());
  await user.profile.save();
  return user.asV1();
}

export const updateProfileInterests = async (args: { ageRange: string, city: string, state: string, interests: string[], values: string[] }, context: { user: any }) => {
  const { id } = context.user;
  const { ageRange, city, state, interests, values } = args;
  const user = await User.findOne({ where: { identityId: id } });
  if (!user) throw new Error('user not found');
  const profile = user.profile;
  if (ageRange) profile.ageRange = ageRange;
  if (city) profile.city = city;
  if (state) profile.state = state;
  if (interests) profile.interests = interests;
  if (values) profile.values = values;
  await profile.save();
  return user.asV1();
}

export const removeProfileInterests = async (args: { interest: string, value: string, ageRange: string }, context: { user: any }) => {
  const { id } = context.user;
  const { interest, value, ageRange } = args;
  const user = await User.findOne({ where: { identityId: id } });
  if (!user) throw new Error('user not found');
  const profile = user.profile;
  if (ageRange) delete profile.ageRange;
  if (interest) {
    const index = profile.interests.indexOf(interest);
    if (index > -1) profile.interests.splice(index, 1);
  }
  if (value) {
    const index = profile.values.indexOf(value);
    if (index > -1) profile.values.splice(index, 1);
  }
  await profile.save()
  return user.asV1();
}
