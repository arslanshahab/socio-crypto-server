import GraphQLJSON from 'graphql-type-json';
import * as participantController from "../controllers/participant";
import * as userController from "../controllers/user";
import * as campaignController from "../controllers/campaign";
import * as socialController from "../controllers/social";
import * as factorController from '../controllers/factor';
import * as withdrawController from '../controllers/withdraw';
import * as kycController from '../controllers/kyc';
import * as ethWithdrawController from '../controllers/ethWithdraw';
import * as externalWallet from '../controllers/externalWallet';
import * as orgController from '../controllers/org';
import * as firebaseController from '../controllers/firebase';
import * as fundingController from '../controllers/fundingWallet';

export const root = {
  JSON: GraphQLJSON,
  helloWorld: () => 'Hello world!',
  participate: userController.participate,
  removeParticipation: userController.removeParticipation,
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
  isLastFactor: factorController.isLastFactor,
  getParticipantByCampaignId: participantController.getParticipantByCampaignId,
  registerKyc: kycController.registerKyc,
  getKyc: kycController.getKyc,
  updateKyc: kycController.updateKyc,
  initiateWithdraw: withdrawController.start,
  updateWithdrawStatus: withdrawController.update,
  getWithdrawals: withdrawController.getWithdrawals,
  getWalletWithPendingBalance: withdrawController.getWalletWithPendingBalance,
  setRecoveryCode: userController.setRecoveryCode,
  updateKycStatus: kycController.updateKycStatus,
  getCampaignMetrics: campaignController.adminGetCampaignMetrics,
  updateProfileInterests: userController.updateProfileInterests,
  removeProfileInterests: userController.removeProfileInterests,
  getParticipantMetrics: participantController.getParticipantMetrics,
  getUserMetrics: userController.getUserMetrics,
  getFollowerCount: socialController.getTotalFollowers,
  getPreviousDayMetrics: userController.getPreviousDayMetrics,
  generateFactorsFromKyc: factorController.generateFactors,
  getEstimatedGasPrice: ethWithdrawController.getEstimatedGasPrice,
  getExternalAddress: externalWallet.get,
  listExternalAddresses: externalWallet.list,
  attachEthereumAddress: externalWallet.attach,
  claimEthereumAddress: externalWallet.claim,
  updateNotificationSettings: userController.updateNotificationSettings,
  adminGetKycByUser: kycController.adminGetKycByUser,
  getWithdrawalsV2: withdrawController.getWithdrawalsV2,
  removeEthereumAddress: externalWallet.remove,
};

export const adminRoot = {
  newOrg: orgController.newOrg,
  getHourlyCampaignMetrics: campaignController.adminGetHourlyCampaignMetrics,
  getHourlyPlatformMetrics: campaignController.adminGetHourlyPlatformMetrics,
  getTotalPlatformMetrics: campaignController.adminGetPlatformMetrics,
  generateCampaignAuditReport: campaignController.generateCampaignAuditReport,
  getHourlyOrgMetrics: orgController.getHourlyOrgMetrics,
  listCampaigns: campaignController.listCampaigns,
  newCampaign: campaignController.createNewCampaign,
  getCurrentCampaignTier: campaignController.getCurrentCampaignTier,
  getExternalAddress: externalWallet.get,
  payoutCampaignRewards: campaignController.payoutCampaignRewards,
  listExternalAddresses: externalWallet.list,
  getCampaignMetrics: campaignController.adminGetCampaignMetrics,
  getWithdrawalsV2: withdrawController.getWithdrawalsV2,
  updateWithdrawStatus: withdrawController.update,
  adminGetKycByUser: kycController.adminGetKycByUser,
  updateKycStatus: kycController.updateKycStatus,
  verifySession: firebaseController.getUserRole,
  attachEthereumAddress: externalWallet.attach,
  claimEthereumAddress: externalWallet.claim,
  getFundingWallet: fundingController.get
}

export const publicRoot = {
  trackAction: participantController.trackAction,
  usernameExists: userController.usernameExists,
  campaignGet: campaignController.publicGet,
  accountExists: userController.accountExists,
};
