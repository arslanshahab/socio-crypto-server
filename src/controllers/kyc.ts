import {S3Client} from "../clients/s3";
import {User} from "../models/User";
import {Validator} from '../schemas';
import { checkPermissions } from '../middleware/authentication';
import { KycUser } from '../types';
import { Firebase } from '../clients/firebase';

const validator = new Validator();

export const registerKyc = async (args: {userKyc: any}, context: {user: any}) => {
    validator.validateKycRegistration(args.userKyc);
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id } });
    if (args.userKyc['idProof']) {
      await S3Client.uploadKycImage(user.id, 'idProof', args.userKyc['idProof']);
      delete args.userKyc['idProof'];
      args.userKyc['hasIdProof'] = true;
    }
    if (args.userKyc['addressProof']) {
      await S3Client.uploadKycImage(user.id, 'addressProof', args.userKyc['addressProof']);
      delete args.userKyc['addressProof'];
      args.userKyc['hasAddressProof'] = true;
    }
    await S3Client.postUserInfo(user.id, args.userKyc);
    user.kycStatus = 'pending';
    await user.save();
    return args.userKyc;
}

export const getKyc = async (_args: any, context: { user:  any }) => {
    const { id, role } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id } });
    const response = await S3Client.getUserObject(user.id);
    if (role !== 'admin') return response;
    if (response.hasAddressProof) response.addressProof = await S3Client.getKycImage(user.id, 'addressProof');
    if (response.hasIdProof) response.idProof = await S3Client.getKycImage(user.id, 'idProof');
    return response;
}

export const updateKyc = async (args: {user: KycUser}, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id } });
    if (args.user.idProof) {
      await S3Client.uploadKycImage(user.id, 'idProof', args.user.idProof);
      delete args.user.idProof;
      args.user.hasIdProof = true;
    }
    if (args.user.addressProof) {
      await S3Client.uploadKycImage(user.id, 'addressProof', args.user.addressProof);
      delete args.user.addressProof;
      args.user.hasAddressProof = true;
    }
    user.kycStatus = 'pending';
    await user.save();
    return S3Client.updateUserInfo(user.id, args.user);
}

export const updateKycStatus = async (args: { userId: string, status: string }, context: { user: any }) => {
  checkPermissions({ hasRole: ['admin'] }, context);
  if (!['approve', 'reject'].includes(args.status)) throw new Error('Status must be either approve or reject');
  const user = await User.findOneOrFail({ where: { id: args.userId }, relations: ['profile', 'notificationSettings'] });
  user.kycStatus = (args.status == 'approve') ? 'approved' : 'rejected';
  await user.save();
  if (user.notificationSettings.kyc) {
    if (user.kycStatus === 'approved') await Firebase.sendKycApprovalNotification(user.profile.deviceToken);
    else await Firebase.sendKycRejectionNotification(user.profile.deviceToken);
  }
  return user.asV1();
}
