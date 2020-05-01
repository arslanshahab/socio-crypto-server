import {encrypt} from "../util/crypto";
import {SocialLink} from "../models/SocialLink";
import {TwitterClient} from '../clients/twitter';
import {me} from "./user";
import logger from '../util/logger';
import { Participant } from '../models/Participant';
import {SocialPost} from "../models/SocialPost";
import {calculateParticipantSocialScore} from "./helpers";
import {Campaign} from "../models/Campaign";

export const allowedSocialLinks = ['twitter', 'facebook'];

export const getSocialClient = (type: string) => {
    let client: any;
    switch (type) {
        case 'twitter':
            client = TwitterClient;
            break;
        default:
            throw new Error('no client for this social link type');
    }
    return client ;
}

export const registerSocialLink = async (args: { type: string, apiKey: string, apiSecret: string }, context: { user: any }) => {
    const user = await me(undefined, context);
    const { type, apiKey, apiSecret } = args;
    if (!allowedSocialLinks.includes(type)) throw new Error('the type must exist as a predefined type');
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

export const removeSocialLink = async (args: { type: string }, context: { user: any }) => {
    const user = await me(undefined, context);
    const { type } = args;
    if (!allowedSocialLinks.includes(type)) throw new Error('the type must exist as a predefined type');
    const existingType = user.socialLinks.find(link => link.type === type);
    if (existingType) await existingType.remove();
    return true;
}

export const postToSocial = async (args: { type: string, text: string, photo: string, participantId: string }, context: { user: any }) => {
  const { type, text, photo, participantId } = args;
  if (!allowedSocialLinks.includes(type)) throw new Error('the type must exist as a predefined type');
  const user = await me(undefined, context);
  const participant = await Participant.findOneOrFail({ where: { id: participantId, user } });
  if (!participant.campaign.isOpen()) throw new Error('campaign is closed');
  const socialLink = user.socialLinks.find(link => link.type === type);
  if (!socialLink) throw new Error(`you have not linked ${type} as a social platform`);
  const client = getSocialClient(type);
  const postId = await client.post(socialLink.asClientCredentials(), text, photo);
  logger.info(`Posted to twitter with ID: ${postId}`);
  const socialPost = await SocialPost.newSocialPost(postId, type, participant.id, user, participant.campaign).save();
  return socialPost.id;
}

export const getTweetById = async (args: { id: string, type: string }, context: { user: any }) => {
    const { id, type } = args;
    const user = await me(undefined, context);
    const socialLink = user.socialLinks.find(link => link.type === 'twitter');
    if (!socialLink) throw new Error(`you have not linked twitter as a social platform`);
    const client = getSocialClient(type);
    return client.get(socialLink.asClientCredentials(), id);
}

export const getParticipantSocialMetrics = async (args: { id: string }, context: { user: any }) => {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const participant = await Participant.findOne({ where });
    if (!participant) throw new Error('participant not found');
    const campaign = await Campaign.findOne({where: {participant}});
    if (!campaign) throw new Error('campaign not found');
    return calculateParticipantSocialScore(participant, campaign);
}
