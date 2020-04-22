import {encrypt} from "../util/crypto";
import {SocialLink} from "../models/SocialLink";
import {TwitterClient} from '../clients/twitter';
import {me} from "./user";
import logger from '../util/logger';
import { Participant } from '../models/Participant';

export const allowedSocialLinks = ['twitter'];

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
  let client: any;
  switch (type) {
    case 'twitter':
      client = TwitterClient;
      break;
    default:
      throw new Error('no client for this social link type');
  }
  const postId = await client.post(socialLink.asClientCredentials(), text, photo);
  logger.info(`Posted to twitter with ID: ${postId}`);
  // store the social link to the database here
  return postId;
}
