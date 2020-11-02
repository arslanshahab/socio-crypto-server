import { recoverPersonalSignature } from 'eth-sig-util';
import { bufferToHex } from 'ethereumjs-util';
import { Admin } from '../models/Admin';
import { ExternalWallet } from '../models/ExternalWallet';
import { Org } from '../models/Org';
import { User } from '../models/User';

export const attach = async (args: { ethereumAddress: string }, context: { user: any }) => {
  const { id, method } = context.user;
  const address = args.ethereumAddress.toLowerCase();
  let user;
  if (method && method === 'firebase') {
    const admin = await Admin.findOne({ where: { firebaseId: id }});
    if (!admin) throw new Error('user not found');
    user = await Org.getByAdminId(admin.id);
  }
  else user = await User.findOne({ where: { identityId: id } });
  if (!user) throw new Error('user not found');
  if (await ExternalWallet.findOne({ where: { ethereumAddress: address } })) throw new Error('ethereum address already registered');
  const externalWallet = ExternalWallet.newFromAttachment(address, user, method === 'firebase');
  await externalWallet.save();
  return externalWallet.asV1();
}

export const claim = async (args: { ethereumAddress: string, signature: string }, context: { user: any }) => {
  const { id, method } = context.user;
  const address = args.ethereumAddress.toLowerCase();
  let user;
  if (method === 'firebase') {
    const admin = await Admin.findOne({ where: { firebaseId: id } });
    if (!admin) throw new Error('admin not found');
    user = await Org.getByAdminId(admin.id);
  }
  else user = await User.findOne({ where: { identityId: id } });
  if (!user) throw new Error('user not found');
  let where: {[key: string]: any} = {ethereumAddress: address};
  if (method === 'firebase') where.org = user as Org;
  else where.user = user as User;
  const externalWallet = await ExternalWallet.findOne({ where });
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
  const { id, method } = context.user;
  const address = args.ethereumAddress.toLowerCase();
  let user;
  if (method === 'firebase') {
    const admin = await Admin.findOne({ where: { firebaseId: id } });
    if (!admin) throw new Error('user not found');
    user = await Org.getByAdminId(admin.id);
  }
  else user = await User.findOne({ where: { identityId: id } });
  if (!user) throw new Error('user not found');
  const externalWallet = await ExternalWallet.getByUserAndAddress(user, address, method === 'firebase');
  if (!externalWallet) throw new Error('external wallet not found');
  return externalWallet.asV1();
}

export const list = async (_args: any, context: { user: any }) => {
  const { id, method } = context.user;
  let user;
  if (method === 'firebase') {
    const admin = await Admin.findOne({ where: { firebaseId: id } });
    if (!admin) throw new Error('user not found');
    user = await Org.getByAdminId(admin.id);
  }
  else user = await User.findOne({ where: { identityId: id }, relations: ['externalWallets'] });
  if (!user) throw new Error('user not found');
  return (user.externalWallets) ? user.externalWallets.map(wallet => wallet.asV1()) : [];
}

export const remove = async (args: { ethereumAddress: string }, context: { user: any }) => {
  const { id } = context.user;
  const wallet = await ExternalWallet.getWalletByAddressAndUserId(id, args.ethereumAddress);
  if (!wallet) throw new Error('external wallet not found');
  await wallet.remove();
  return true;
}
