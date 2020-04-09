import { Participant } from '../models/Participant';
import { Campaign } from '../models/Campaign';
import { User } from '../models/User';
import GraphQLJSON from 'graphql-type-json';
import {generateCampaignAuditReport, payoutCampaignRewards} from "../actions/campaign";

export const root = {
  JSON: GraphQLJSON,
  helloWorld: () => 'Hello world!',
  participate: User.participate,
  removeParticipation: User.removeParticipation,
  newUser: User.signUp,
  newCampaign: Campaign.newCampaign,
  listCampaigns: Campaign.list,
  getCampaign: Campaign.get,
  updateCampaign: Campaign.updateCampaign,
  deleteCampaign: Campaign.deleteCampaign,
  promoteUserPermissions: User.promotePermissions,
  listUsers: User.list,
  me: User.me,
  generateCampaignAuditReport: generateCampaignAuditReport,
  payoutCampaignRewards: payoutCampaignRewards,
  getCurrentCampaignTier: Campaign.getCurrentCampaignTier
};

export const publicRoot = {
  trackAction: Participant.trackAction,
  usernameExists: User.usernameExists,
  campaignGet: Campaign.publicGet,
};
