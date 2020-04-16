import {encrypt} from "../util/crypto";
import {SocialLink} from "../models/SocialLink";
import {me} from "./user";

export const registerSocialLink = async (args: { type: string, apiKey: string, apiSecret: string }, context: { user: any }) => {
    const user = await me(undefined, context);
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

export const removeSocialLink = async (args: { type: string }, context: { user: any }) => {
    const user = await me(undefined, context);
    const { type } = args;
    if (!['facebook','twitter'].includes(type)) throw new Error('the type must exist as a predefined type');
    const existingType = user.socialLinks.find(link => link.type === type);
    if (existingType) await existingType.remove();
    return true;
}
