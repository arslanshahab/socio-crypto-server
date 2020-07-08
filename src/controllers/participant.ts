import { RedisStore, getGraphQLRateLimiter } from 'graphql-rate-limit';
import {Campaign} from "../models/Campaign";
import {User} from "../models/User";
import {Dragonchain} from "../clients/dragonchain";
import {Participant} from "../models/Participant";
import {SocialPost} from "../models/SocialPost";
import {getTweetById} from '../controllers/social';
import { getRedis } from '../clients/redis';

const { RATE_LIMIT_MAX = '3', RATE_LIMIT_WINDOW = '1m' } = process.env;

const rateLimiter = getGraphQLRateLimiter({
  formatError: () => 'Too many requests',
  identifyContext: (ctx) => {
    return ctx.connection.remoteAddress || ctx.socket.remoteAddress;
  },
  store: new RedisStore(getRedis().client),
});

export const getParticipantByCampaignId = async (args: { campaignId: string }, context: { user: any }) => {
  const { id } = context.user;
  const user = await User.findOneOrFail({ where: { identityId: id } });
  const campaign = await Campaign.findOneOrFail({ where: { id: args.campaignId } });
  const particpant = await Participant.findOneOrFail({ where: { user, campaign }, relations: ['user', 'campaign'] });
  return particpant.asV1();
};

export const trackAction = async (args: { participantId: string, action: 'click' | 'view' | 'submission' }, context: any, info: any) => {
    const errorMessage = await rateLimiter({ parent: {}, args, context, info }, { max: Number(RATE_LIMIT_MAX), window: RATE_LIMIT_WINDOW });
    if (errorMessage) throw new Error(errorMessage);
    if (!['click', 'view', 'submission'].includes(args.action)) throw new Error('invalid metric specified');
    const participant = await Participant.findOne({ where: { id: args.participantId }, relations: ['campaign'] });
    if (!participant) throw new Error('participant not found');
    if (!participant.campaign.isOpen()) throw new Error('campaign is closed');
    const campaign = await Campaign.findOne({ where: { id: participant.campaign.id }});
    if (!campaign) throw new Error('campaign not found');
    switch (args.action) {
        case 'click':
            participant.clickCount++;
            break;
        case 'view':
            participant.viewCount++;
            break;
        case 'submission':
            participant.submissionCount++;
            break;
        default:
            break;
    }
    const pointValue = campaign.algorithm.pointValues[args.action];
    campaign.totalParticipationScore = BigInt(campaign.totalParticipationScore) + BigInt(pointValue);
    participant.participationScore = BigInt(participant.participationScore) + BigInt(pointValue);
    await campaign.save();
    await participant.save();
    await Dragonchain.ledgerCampaignAction(args.action, participant.id, participant.campaign.id);
    return participant.asV1();
};

export const getParticipant = async (args: { id: string }) => {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const participant = await Participant.findOne({ where, relations: ['user'] });
    if (!participant) throw new Error('participant not found');
    return participant.asV1();
};

export const getPosts = async (args: { id: string }, context: any) => {
  try {
    const { id } = args;
    const results: Promise<any>[] = [];
    const where: { [key: string]: string } = { id };
    const participant = await Participant.findOne({ where });
    if (!participant) throw new Error('participant not found');
    const posts = await SocialPost.find({ where: { participantId: participant.id } });
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      try {
        const tweet = await getTweetById({ id: post.id, type: 'twitter'}, context);
        results.push(tweet);
      } catch (_) {};
    }
    return results;
  } catch (e) {
    console.log('Error: ')
    console.log(e)
    console.log('____')
    return false
  }
}
