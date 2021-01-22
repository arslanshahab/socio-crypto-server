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
import * as stripeController from '../controllers/stripe';

export const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    helloWorld: () => 'Hello world!',
    listCampaigns: campaignController.listCampaigns,
    getCampaign: campaignController.get,
    getParticipant: participantController.getParticipant,
    getParticipantPosts: participantController.getPosts,
    listUsers: userController.list,
    me: userController.me,
    getCurrentCampaignTier: campaignController.getCurrentCampaignTier,
    isLastFactor: factorController.isLastFactor,
    getParticipantByCampaignId: participantController.getParticipantByCampaignId,
    getKyc: kycController.getKyc,
    getWithdrawals: withdrawController.getWithdrawals,
    getWalletWithPendingBalance: withdrawController.getWalletWithPendingBalance,
    getCampaignMetrics: campaignController.adminGetCampaignMetrics,
    getParticipantMetrics: participantController.getParticipantMetrics,
    getUserMetrics: userController.getUserMetrics,
    getFollowerCount: socialController.getTotalFollowers,
    getPreviousDayMetrics: userController.getPreviousDayMetrics,
    generateFactorsFromKyc: factorController.generateFactors,
    getEstimatedGasPrice: ethWithdrawController.getEstimatedGasPrice,
    getExternalAddress: externalWallet.get,
    getWithdrawalsV2: withdrawController.getWithdrawalsV2,
    listExternalAddresses: externalWallet.list,
    getSocialMetrics: socialController.getParticipantSocialMetrics,
    adminGetKycByUser: kycController.adminGetKycByUser,
  },
  Mutation: {
    registerSocialLink: socialController.registerSocialLink,
    postToSocial: socialController.postToSocial,
    setDevice: userController.setDevice,
    participate: userController.participate,
    removeParticipation: userController.removeParticipation,
    newCampaign: campaignController.createNewCampaign,
    updateCampaign: campaignController.updateCampaign,
    deleteCampaign: campaignController.deleteCampaign,
    promoteUserPermissions: userController.promotePermissions,
    removeSocialLink: socialController.removeSocialLink,
    generateCampaignAuditReport: campaignController.generateCampaignAuditReport,
    payoutCampaignRewards: campaignController.payoutCampaignRewards,
    registerFactorLink: factorController.registerFactorLink,
    removeFactorLink: factorController.removeFactorLink,
    updateUsername: userController.updateUsername,
    registerKyc: kycController.registerKyc,
    updateKyc: kycController.updateKyc,
    initiateWithdraw: withdrawController.start,
    updateWithdrawStatus: withdrawController.update,
    setRecoveryCode: userController.setRecoveryCode,
    updateKycStatus: kycController.updateKycStatus,
    updateProfileInterests: userController.updateProfileInterests,
    removeProfileInterests: userController.removeProfileInterests,
    attachEthereumAddress: externalWallet.attach,
    claimEthereumAddress: externalWallet.claim,
    updateNotificationSettings: userController.updateNotificationSettings,
    removeEthereumAddress: externalWallet.remove,
    uploadProfilePicture: userController.uploadProfilePicture,
  }
};

export const adminResolvers = {
  Query: {
    getHourlyCampaignMetrics: campaignController.adminGetHourlyCampaignMetrics,
    getHourlyPlatformMetrics: campaignController.adminGetHourlyPlatformMetrics,
    getTotalPlatformMetrics: campaignController.adminGetPlatformMetrics,
    getHourlyOrgMetrics: orgController.getHourlyOrgMetrics,
    getCurrentCampaignTier: campaignController.getCurrentCampaignTier,
    getExternalAddress: externalWallet.get,
    listCampaigns: campaignController.listCampaigns,
    listExternalAddresses: externalWallet.list,
    getCampaignMetrics: campaignController.adminGetCampaignMetrics,
    getWithdrawalsV2: withdrawController.getWithdrawalsV2,
    getWithdrawalHistory: withdrawController.getWithdrawalHistory,
    adminGetKycByUser: kycController.adminGetKycByUser,
    getFundingWallet: fundingController.get,
    verifySession: firebaseController.getUserRole,
    listOrgs: orgController.listOrgs,
    listEmployees: orgController.listEmployees,
    listPaymentMethods: stripeController.listPaymentMethods,
    listPendingCampaigns: campaignController.adminListPendingCampaigns,
  },
  Mutation: {
    newOrg: orgController.newOrg,
    generateCampaignAuditReport: campaignController.generateCampaignAuditReport,
    newCampaign: campaignController.createNewCampaign,
    payoutCampaignRewards: campaignController.payoutCampaignRewards,
    updateWithdrawStatus: withdrawController.update,
    updateKycStatus: kycController.updateKycStatus,
    attachEthereumAddress: externalWallet.attach,
    claimEthereumAddress: externalWallet.claim,
    updatePassword: firebaseController.updateUserPassword,
    newUser: orgController.newUser,
    addPaymentMethod: stripeController.addPaymentMethod,
    purchaseCoiin: stripeController.purchaseCoiin,
    updateCampaignStatus: campaignController.adminUpdateCampaignStatus,
    sendUserMessages: userController.sendUserMessages,
  }
}

export const publicResolvers = {
  Query: {
    trackAction: participantController.trackAction,
    usernameExists: userController.usernameExists,
    campaignGet: campaignController.publicGet,
    accountExists: userController.accountExists,
  }
};
