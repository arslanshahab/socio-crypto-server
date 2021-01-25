import { Response } from 'express';
import jwt from 'jsonwebtoken';
import * as Dragonfactor from '@dragonchain-dev/dragonfactor-auth';
import { asyncHandler, extractFactor, generateRandomNumber, createFactorsFromKycData } from '../util/helpers';
import {AuthRequest, FactorGeneration} from '../types';
import {FactorLink} from '../models/FactorLink';
import { Secrets } from '../util/secrets';
import { User } from '../models/User';
import { serverBaseUrl } from '../config';
import { Wallet } from '../models/Wallet';
import { Dragonchain } from '../clients/dragonchain';
import { sha256Hash } from '../util/crypto';
import { limit } from '../util/rateLimiter';
import { S3Client } from '../clients/s3';
import { Profile } from '../models/Profile';
import { NotificationSettings } from '../models/NotificationSettings';

const { NODE_ENV } = process.env;

export const registerFactorLink = async (parent: any, args: { factor: Dragonfactor.FactorLoginRequest }, context: { user: any }) => {
  const { identityId, factors } = await Dragonfactor.validateFactor({ factorRequest: args.factor, acceptedFactors: ['email', 'myfii-kyc'], service: 'raiinmaker' });
  const { id } = context.user;
  const user = await User.findOneOrFail({ where: { identityId: id }, relations: ['factorLinks'] });
  for (let i = 0; i < factors.length; i++) {
    const { providerId, id, type, name } = factors[i];
    if (await FactorLink.findOne({ where: { factorId: id, providerId } })) throw new Error('factor link is already registered');
    const factorLink = new FactorLink();
    factorLink.factorId = id;
    factorLink.providerId = providerId;
    factorLink.identityId = identityId;
    factorLink.user = user;
    factorLink.type = type;
    if (name) factorLink.name = name;
    await factorLink.save();
    user.factorLinks = [...user.factorLinks, factorLink];
  }
  return user.asV1();
}

export const removeFactorLink = async (parent: any, args: { factorId: string }, context: { user: any }) => {
  const { id } = context.user;
  const user = await User.findOneOrFail({ where: { identityId: id }, relations: ['factorLinks'] });
  const factorLink = user.factorLinks.find((link: FactorLink) => link.factorId === args.factorId);
  if (!factorLink) throw new Error('requested factor not found');
  await factorLink.remove();
  if (factorLink.type === 'myfii-kyc') {
    await S3Client.deleteKycElement(user.id, factorLink.name);
    user.kycStatus = '';
    await user.save();
  }
  return user.asV1();
}

export const isLastFactor = async (_parent: any, args: any, context: {user: any}) => {
  const { id } = context.user;
  const user = await User.findOneOrFail({ where: { identityId: id }, relations: ['factorLinks'] });
  return user.factorLinks.length === 1;
}


export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { identityId, factors } = req.user;
  let user = await User.findOne({ where: { identityId }, relations: ['factorLinks'] });
  let emailAddress: string;
  if (!user) {
    user = new User();
    const wallet = new Wallet();
    const factorLink = new FactorLink();
    const profile = new Profile();
    const notificationSettings = new NotificationSettings();
    user.identityId = identityId;
    profile.username = `raiinmaker-${generateRandomNumber()}`;
    await user.save();
    wallet.user = user;
    await wallet.save();
    profile.user = user;
    await profile.save();
    notificationSettings.user = user;
    await notificationSettings.save();
    user.profile = profile;
    user.notificationSettings = notificationSettings;
    for (let i = 0; i < factors.length; i++) {
      const { type, id, providerId, factor } = factors[i];
      factorLink.type = type;
      factorLink.factorId = id;
      factorLink.identityId = identityId;
      factorLink.providerId = providerId;
      factorLink.user = user;
      await factorLink.save();
      if (factor && type === 'email') {
        emailAddress = extractFactor(factor);
        profile.email = emailAddress;
        emailAddress = emailAddress.split('@')[1];
        await user.save();
        await profile.save();
      }
    }
  } else {
    if (user.profile.email) emailAddress = user.profile.email.split('@')[1];
    for (let i = 0; i < factors.length; i++) {
      const { type, id, providerId, factor } = factors[i];
      if (!user.factorLinks.find((link: FactorLink) => link.factorId === id)) {
        const factorLink = new FactorLink();
        factorLink.type = type;
        factorLink.factorId = id;
        factorLink.identityId = identityId;
        factorLink.providerId = providerId;
        factorLink.user = user;
        await factorLink.save();
        user.factorLinks.push(factorLink);
        await user.save();
        if (type === 'email' && factor) {
          emailAddress = extractFactor(factor).split('@')[1];
          user.profile.email = extractFactor(factor);
          await user.profile.save();
          await user.save();
        }
      }
    }
  }
  const jwtPayload: {[key: string]: string} = { id: identityId };
  if (emailAddress! && ['raiinmaker.com', 'dragonchain.com'].includes(emailAddress!) || NODE_ENV === 'development') {
    jwtPayload.role = 'admin';
    jwtPayload.company = 'raiinmaker';
  }
  const token = jwt.sign(jwtPayload, Secrets.encryptionKey, { expiresIn: 60 * 30, audience: serverBaseUrl });
  return res.status(200).json({ success: true, token, id: user.id, role: jwtPayload.role, company: jwtPayload.company });
});

export const recover = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { identityId, code, message } = req.user;
  const shouldRateLimit = await limit(message, 4);
  if (shouldRateLimit) return res.status(429).json({ code: 'REQUEST_LIMIT', message: 'too many requests' });
  if (isNaN(Number(code))) return res.status(400).json({ code: 'MALFORMED_INPUT', message: 'recovery code must be a integer' });
  if (await User.findOne({ where: { identityId } })) return res.status(429).json({ code: 'ACCOUNT_CONFLICT', message: 'an account with that identity already exists' })
  const profile = await Profile.findOne({ where: { username: message, recoveryCode: sha256Hash(code.toString()) }, relations: ['user']});
  if (!profile) {
    await Dragonchain.ledgerAccountRecoveryAttempt(undefined, identityId, message, code, false);
    return res.status(404).json({ code: 'NOT_FOUND', message: 'requested account not found' });
  }
  const user = profile.user;
  await S3Client.deleteUserInfoIfExists(user.id);
  await S3Client.deleteKycImage(user.id, 'idProof');
  await S3Client.deleteKycImage(user.id, 'addressProof');
  await Dragonchain.ledgerAccountRecoveryAttempt(user.id, identityId, message, code, true);
  user.identityId = identityId;
  user.kycStatus = '';
  await user.save();
  return res.status(200).json({ success: true });
});

export const generateFactors = async (parent: any, args: { factors: FactorGeneration[] }, context: { user: any }) => {
  const { id } = context.user;
  const { factors } = args;
  if (!factors) throw new Error('must provide factor association IDs');
  const user = await User.findOne({where: { identityId: id }});
  if (!user) throw new Error('user not found');
  if (user.kycStatus !== 'approved') throw new Error('you can only generate factors with an approved KYC');
  const kycData = await S3Client.getUserObject(user.id);
  return createFactorsFromKycData(kycData, factors);
}
