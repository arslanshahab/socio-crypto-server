import {Admin} from "../models/Admin";
import {Org} from "../models/Org";


export const get = async (parent: any, args: any, context: {user: any}) => {
  const { id } = context.user;
  const admin = await Admin.findOne({ where: { firebaseId: id }});
  if (!admin) throw new Error('user not found');
  const org = await Org.getByAdminId(admin.id);
  if (!org) throw Error('org not found');
  return org.wallet.asV1();
}
