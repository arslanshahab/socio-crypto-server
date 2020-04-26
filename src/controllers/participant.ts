import {Campaign} from "../models/Campaign";
import {Dragonchain} from "../clients/dragonchain";
import {Participant} from "../models/Participant";
import {SocialPost} from "../models/SocialPost";
import {getTweetById} from '../controllers/social';

export const trackAction = async (args: { participantId: string, action: 'click' | 'view' | 'submission' }, context: any) => {
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
    return participant;
};

export const getParticipant = async (args: { id: string }) => {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const participant = await Participant.findOne({ where });
    if (!participant) throw new Error('participant not found');
    return participant;
};

export const getPosts = async (args: { id: string }, context: any) => {
  try {
  const { id } = args;
  const results: Promise<any>[] = [];
  const where: { [key: string]: string } = { id };
  const participant = await Participant.findOne({ where });
  if (!participant) throw new Error('participant not found');
  const posts = await SocialPost.find({ where: { participantId: participant.id } });
    posts.forEach(post => {
      results.push(getTweetById({ id: post.id, type: 'twitter'}, context))
    });
    return results;
  } catch (e) {
    console.log('Error: ')
    console.log(e)
    console.log('____')
    return false
  }
}
