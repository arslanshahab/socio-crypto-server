import { Response } from 'express';
import jwt from 'jsonwebtoken';
import * as Dragonfactor from '@dragonchain-dev/dragonfactor-auth';
import { asyncHandler, extractFactor } from '../util/helpers';
import { AuthRequest } from '../types';
import {FactorLink} from '../models/FactorLink';
import {me} from "./user";
import { Secrets } from '../util/secrets';
import { User } from '../models/User';
import { serverBaseUrl } from '../config';
import { Wallet } from '../models/Wallet';

export const registerFactorLink = async (args: { factor: Dragonfactor.FactorLoginRequest }, context: { user: any }) => {
  const { identityId, factors } = await Dragonfactor.validateFactor({ factorRequest: args.factor, acceptedFactors: ['email'], service: 'raiinmaker' });
  const user = await me(undefined, context);
  for (let i = 0; i < factors.length; i++) {
    const { providerId, id, type } = factors[i];
    if (await FactorLink.findOne({ where: { factorId: id, providerId } })) throw new Error('factor link is already registered');
    const factorLink = new FactorLink();
    factorLink.factorId = id;
    factorLink.providerId = providerId;
    factorLink.identityId = identityId;
    factorLink.user = user;
    factorLink.type = type;
    await factorLink.save();
    user.factorLinks = [...user.factorLinks, factorLink];
  }
  return user;
}

export const removeFactorLink = async (args: { factorId: string }, context: { user: any }) => {
  const user = await me(undefined, context);
  const factorLink = user.factorLinks.find((link: FactorLink) => link.factorId === args.factorId);
  if (!factorLink) throw new Error('requested factor not found');
  await factorLink.remove();
  return user;
}


export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { identityId, factors } = req.user;
  const user = await User.findOne({ where: { id: identityId }, relations: ['factorLinks'] });
  if (!user) {
    const newUser = new User();
    const wallet = new Wallet();
    const factorLink = new FactorLink();
    newUser.id = identityId;
    await newUser.save();
    wallet.user = newUser;
    await wallet.save();
    for (let i = 0; i < factors.length; i++) {
      const { type, id, providerId, factor } = factors[i];
      factorLink.type = type;
      factorLink.factorId = id;
      factorLink.identityId = identityId;
      factorLink.providerId = providerId;
      factorLink.user = newUser;
      await factorLink.save();
      if (factor && type === 'email') {
        newUser.email = extractFactor(factor);
        await newUser.save();
      }
    }
  } else {
    for (let i = 0; i < factors.length; i++) {
      const { type, id, providerId } = factors[i];
      if (!user.factorLinks.find((link: FactorLink) => link.factorId === id)) {
        const factorLink = new FactorLink();
        factorLink.type = type;
        factorLink.factorId = id;
        factorLink.identityId = identityId;
        factorLink.providerId = providerId;
        factorLink.user = user;
        await factorLink.save();
      }
    }
  }
  const token = jwt.sign({ id: identityId }, Secrets.encryptionKey, { expiresIn: 60 * 30, audience: serverBaseUrl });
  return res.status(200).json({ success: true, token, id: identityId });
});