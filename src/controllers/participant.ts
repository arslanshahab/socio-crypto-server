import { RedisStore, getGraphQLRateLimiter } from 'graphql-rate-limit';
import {Campaign} from "../models/Campaign";
import {User} from "../models/User";
import {Dragonchain} from "../clients/dragonchain";
import {Participant} from "../models/Participant";
import {SocialPost} from "../models/SocialPost";
import {getTweetById} from '../controllers/social';
import { getRedis } from '../clients/redis';
import { BN } from '../util/helpers';
import { DailyParticipantMetric } from '../models/DailyParticipantMetric';
import { getDatesBetweenDates, formatUTCDateForComparision } from './helpers';

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
    const participant = await Participant.findOne({ where: { id: args.participantId }, relations: ['campaign','user'] });
    if (!participant) throw new Error('participant not found');
    if (!participant.campaign.isOpen()) throw new Error('campaign is closed');
    const campaign = await Campaign.findOne({ where: { id: participant.campaign.id }});
    if (!campaign) throw new Error('campaign not found');
    switch (args.action) {
        case 'click':
            participant.clickCount = participant.clickCount.plus(new BN(1));
            break;
        case 'view':
            participant.viewCount = participant.viewCount.plus(new BN(1));
            break;
        case 'submission':
            participant.submissionCount = participant.submissionCount.plus(new BN(1));
            break;
        default:
            throw new Error("Action not supported");
    }
    const pointValue = campaign.algorithm.pointValues[args.action];
    campaign.totalParticipationScore = campaign.totalParticipationScore.plus(pointValue);
    participant.participationScore = participant.participationScore.plus(pointValue);
    await campaign.save();
    await participant.save();
    await DailyParticipantMetric.upsert(participant.user, campaign, participant, args.action, pointValue);
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

export const getParticipantMetrics = async (args: { participantId: string }, context: { user: any }) => {
  const { id } = context.user;
  const { participantId } = args;
  const additionalRows = [];
  const user = await User.findOne({ where: { identityId: id } });
  if (!user) throw new Error('user not found');
  const participant = await Participant.findOne({ where: { id: participantId, user }, relations: ['campaign'] });
  if (!participant) throw new Error('participant not found');
  const metrics = await DailyParticipantMetric.getSortedByParticipantId(participantId);
  if (metrics.length > 0 && formatUTCDateForComparision(metrics[metrics.length - 1].createdAt) !== formatUTCDateForComparision(new Date())) {
    const datesInBetween = getDatesBetweenDates(new Date(metrics[metrics.length-1].createdAt), new Date());
    for (let i = 0; i < datesInBetween.length; i++) { additionalRows.push(await DailyParticipantMetric.insertPlaceholderRow(datesInBetween[i], metrics[metrics.length-1].totalParticipationScore, participant.campaign, user, participant)); }
  }
  return metrics.concat(additionalRows).map(metric => metric.asV1());
}
