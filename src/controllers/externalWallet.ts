import { recoverPersonalSignature } from 'eth-sig-util';
import { bufferToHex } from 'ethereumjs-util';
import { ExternalWallet } from '../models/ExternalWallet';
import { User } from '../models/User';

export const attach = async (args: { ethereumAddress: string }, context: { user: any }) => {
  const { id } = context.user;
  const address = args.ethereumAddress.toLowerCase();
  const user = await User.findOne({ where: { identityId: id } });
  if (!user) throw new Error('user not found');
  if (await ExternalWallet.findOne({ where: { ethereumAddress: address } })) throw new Error('ethereum address already registered');
  const externalWallet = ExternalWallet.newFromAttachment(address, user);
  await externalWallet.save();
  return externalWallet.asV1();
}

export const claim = async (args: { ethereumAddress: string, signature: string }, context: { user: any }) => {
  const { id } = context.user;
  const address = args.ethereumAddress.toLowerCase();
  const user = await User.findOne({ where: { identityId: id } });
  if (!user) throw new Error('user not found');
  const externalWallet = await ExternalWallet.findOne({ where: { ethereumAddress: address, user } });
  if (!externalWallet) throw new Error('external wallet not found');
  if (externalWallet.claimed) throw new Error('external wallet already claimed');
  const msgBufferHex = bufferToHex(Buffer.from(externalWallet.claimMessage, 'utf8'));
  const extractedAddress = recoverPersonalSignature({ data: msgBufferHex, sig: args.signature });
  if (extractedAddress.toLowerCase() !== address) throw new Error('invalid signature');
  externalWallet.claimed = true;
  await externalWallet.save();
  return externalWallet.asV1();
}

export const get = async (args: { ethereumAddress: string }, context: { user: any }) => {
  const { id } = context.user;
  const user = await User.findOne({ where: { identityId: id } });
  if (!user) throw new Error('user not found');
  const externalWallet = await ExternalWallet.getByUserAndAddress(user, args.ethereumAddress);
  if (!externalWallet) throw new Error('external wallet not found');
  return externalWallet.asV1();
}

export const list = async (_args: any, context: { user: any }) => {
  const { id } = context.user;
  const user = await User.findOne({ where: { identityId: id }, relations: ['externalWallets'] });
  if (!user) throw new Error('user not found');
  return (user.externalWallets) ? user.externalWallets.map(wallet => wallet.asV1()) : [];
}
