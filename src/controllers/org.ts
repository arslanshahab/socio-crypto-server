import {Firebase} from "../clients/firebase";
import {Admin} from "../models/Admin";
import {Org} from "../models/Org";
import {checkPermissions} from "../middleware/authentication";
import {HourlyCampaignMetric} from "../models/HourlyCampaignMetric";

export const newOrg = async (args: {orgName: string, adminName: string}, context: {user: any}) => {
  const { orgName } = args;
  const { user } = context;
  await Firebase.setCustomUserClaims(user.id, orgName, 'admin');
  const admin = new Admin();
  admin.firebaseId = user.id;
  await admin.save();
  const org = Org.newOrg(orgName, [admin]);
  await org.save();
  return org;
};

export const getHourlyOrgMetrics = async (args: any, context: {user: any}) => {
  const {company} = checkPermissions({ hasRole: ['admin']}, context);
  const org = await Org.findOne({where: {name: company}});
  if (!org) throw new Error('org not found');
  return await HourlyCampaignMetric.getSortedByOrgId(org.id);
}
