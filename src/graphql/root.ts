import GraphQLJSON from 'graphql-type-json';
import * as participantController from "../controllers/participant";
import * as userController from "../controllers/user";
import * as campaignController from "../controllers/campaign";
import * as socialController from "../controllers/social";
import * as factorController from '../controllers/factor';

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
  getParticipantPosts: participantController.getPosts,
  updateCampaign: campaignController.updateCampaign,
  deleteCampaign: campaignController.deleteCampaign,
  promoteUserPermissions: userController.promotePermissions,
  listUsers: userController.list,
  me: userController.me,
  removeSocialLink: socialController.removeSocialLink,
  generateCampaignAuditReport: campaignController.generateCampaignAuditReport,
  payoutCampaignRewards: campaignController.payoutCampaignRewards,
  getCurrentCampaignTier: campaignController.getCurrentCampaignTier,
  registerSocialLink: socialController.registerSocialLink,
  postToSocial: socialController.postToSocial,
  setDevice: userController.setDevice,
  getSocialMetrics: socialController.getParticipantSocialMetrics,
  registerFactorLink: factorController.registerFactorLink,
  removeFactorLink: factorController.removeFactorLink,
  updateUsername: userController.updateUsername,
};

export const publicRoot = {
  trackAction: participantController.trackAction,
  usernameExists: userController.usernameExists,
  campaignGet: campaignController.publicGet,
};
