import GraphQLJSON from 'graphql-type-json';
import {generateCampaignAuditReport, payoutCampaignRewards} from "../actions/campaign";
import * as participantController from "../controllers/participant";
import * as userController from "../controllers/user";
import * as campaignController from "../controllers/campaign";
import * as socialLinkController from "../controllers/socialLink";

export const root = {
  JSON: GraphQLJSON,
  helloWorld: () => 'Hello world!',
  participate: userController.participate,
  removeParticipation: userController.removeParticipation,
  newUser: userController.signUp,
  newCampaign: campaignController.createNewCampaign,
  listCampaigns: campaignController.listCampaigns,
  getCampaign: campaignController.get,
  getParticipant: participantController.getParticipant,
  updateCampaign: campaignController.updateCampaign,
  deleteCampaign: campaignController.deleteCampaign,
  promoteUserPermissions: userController.promotePermissions,
  listUsers: userController.list,
  me: userController.me,
  removeSocialLink: socialLinkController.removeSocialLink,
  generateCampaignAuditReport: generateCampaignAuditReport,
  payoutCampaignRewards: payoutCampaignRewards,
  getCurrentCampaignTier: campaignController.getCurrentCampaignTier,
  registerSocialLink: socialLinkController.registerSocialLink,
};

export const publicRoot = {
  trackAction: participantController.trackAction,
  usernameExists: userController.usernameExists,
  campaignGet: campaignController.publicGet,
};
