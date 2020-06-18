import {S3Client} from "../clients/s3";
import {User} from "../models/User";
import {Validator} from '../schemas';

const validator = new Validator();

export const registerKyc = async (args: {userKyc: object}, context: {user: any}) => {
    validator.validateKycRegistration(args.userKyc);
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { id } });
    await S3Client.postUserInfo(user.id, args.userKyc);
    return args.userKyc;
}

export const getKyc = async (_args: any, context: { user:  any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { id } });
    return await S3Client.getUserObject(user.id);
}

export const updateKyc = async (args: {user: {[key: string]: string}}, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { id } });
    return S3Client.updateUserInfo(user.id, args.user);
}
