import {S3Client} from "../clients/s3";
import {User} from "../models/User";
import {Validator} from '../schemas';
import { checkPermissions } from '../middleware/authentication';

const validator = new Validator();

export const registerKyc = async (args: {userKyc: object}, context: {user: any}) => {
    validator.validateKycRegistration(args.userKyc);
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id } });
    await S3Client.postUserInfo(user.id, args.userKyc);
    user.kycStatus = 'pending';
    await user.save();
    return args.userKyc;
}

export const getKyc = async (_args: any, context: { user:  any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id } });
    return await S3Client.getUserObject(user.id);
}

export const updateKyc = async (args: {user: {[key: string]: string}}, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id } });
    return S3Client.updateUserInfo(user.id, args.user);
}

export const updateKycStatus = async (args: { userId: string, status: string }, context: { user: any }) => {
  checkPermissions({ hasRole: ['admin'] }, context);
  if (!['approve', 'reject'].includes(args.status)) throw new Error('Status must be either approve or reject');
  const user = await User.findOneOrFail({ where: { id: args.userId } });
  user.kycStatus = (args.status == 'approve') ? 'approved' : 'rejected';
  await user.save();
  return user;
}
