import * as Dragonfactor from '@dragonchain-dev/dragonfactor-auth';
import {me} from "./user";
import {FactorLink} from '../models/FactorLink';

export const registerFactorLink = async (args: { factor: Dragonfactor.FactorLoginRequest }, context: { user: any }) => {
  const { id, providerId, identityId, type } = await Dragonfactor.validateFactor({ factorRequest: args.factor, acceptedFactors: ['email'], service: 'raiinmaker' });
  const user = await me(undefined, context);
  if (await FactorLink.findOne({ where: { factorId: id, providerId } })) throw new Error('factor link is already registered');
  const factorLink = new FactorLink();
  factorLink.factorId = id;
  factorLink.providerId = providerId;
  factorLink.identityId = identityId;
  factorLink.user = user;
  factorLink.type = type;
  await factorLink.save();
  user.factorLinks = [...user.factorLinks, factorLink];
  return user;
}

export const removeFactorLink = async (args: { factorId: string }, context: { user: any }) => {
  const user = await me(undefined, context);
  const factorLink = user.factorLinks.find((link: FactorLink) => link.factorId === args.factorId);
  if (!factorLink) throw new Error('requested factor not found');
  await factorLink.remove();
  return user;
}