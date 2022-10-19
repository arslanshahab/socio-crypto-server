// import { NotificationSettings } from "../models/NotificationSettings";
// import { Org } from "../models/Org";
// import { Profile } from "../models/Profile";
// import { User } from "../models/User";
// import { KycStatus } from "../util/constants";
// import { Wallet } from "../models/Wallet";

export const registerUserRoute = "/v1/auth/register-user";
export const userLoginRoute = "/v1/auth/user-login ";
export const resetPasswordRoute = "/v1/auth/reset-user-password ";
export const recoverUserAccountStep1Route = "/v1/auth/recover-user-account-step1";
export const recoverUserAccountStep2Route = "/v1/auth/recover-user-account-step2";
export const startVerificationRoute = "/v1/auth/start-verification";
export const completeVerificationRoute = "/v1/auth/complete-verification";
export const usernameExistsRoute = "/v1/auth/username-exists";
export const updateAdminPasswordRoute = "/v1/auth/update-admin-password";
export const resetAdminPasswordRoute = "/v1/auth/reset-password";
export const startAdminVerificationRoute = "/v1/auth/start-admin-verification ";
export const adminLoginRoute = "/v1/auth/admin-login";
export const campaignRoute = "/v1/campaign";
export const getOneCampaignRoute = "/v1/campaign/one/:id ";
export const currentCampaignTierRoute = "/v1/campaign/current-campaign-tier";
export const campaignMetricsRoute = "/v1/campaign/campaign-metrics";
export const createCampaignRoute = "/v1/campaign/create-campaign";
export const updateCampaignRoute = "/v1/campaign/update-campaign";
export const deleteCampaignRoute = "/v1/campaign/delete-campaign";
export const payoutCampaignRewardsRoute = "/v1/campaign/payout-campaign-rewards";
export const generateCampaignAuditReportRoute = "/v1/campaign/generate-campaign-audit-report";
export const dashboardCampaignMetricsIdRoute = " /v1/campaign/dashboard-metrics/:campaignId";
export const campaignsLiteRoute = "/v1/campaign/campaigns-lite";
export const updatePendingCampaignStatusRoute = "/v1/campaign/pending";
export const campaignPayoutIdRoute = "/v1/campaign/payout/:campaignId ";
export const supportedCryptoRoute = "/v1/crypto/supported-crypto";
export const addToWalletRoute = "/v1/crypto/add-to-wallet ";
export const deleteFromWallet = "/v1/crypto/delete-from-wallet  ";
export const fundingWalletRoute = " /v1/funding-wallet/  ";
export const transactionHistoryRoute = "/v1/funding-wallet/transaction-history";
export const kycRoute = "/v1/kyc/";
export const kycDownloadRoute = " /v1/kyc/download";
export const kycAdminUserIdRoute = "/v1/kyc/admin/:userId  ";
export const kycVerifyLevelRoute = "/v1/kyc/verify/level1";
export const updateKycRoute = "/v1/kyc/update-kyc ";
export const updateKycStatusRoute = "/v1/kyc/update-kyc-status";
export const kycVerifyAdmin = "/v1/kyc/verify-admin ";
export const kycWebhookRoute = "/v1/kyc/webhook";
export const ListEmployeesRoute = " /v1/organization/list-employees ";
export const orgDetailsRoute = "/v1/organization/org-details";
export const newUserRoute = "/v1/organization/new-user";
export const orgDeleteUserRoute = " /v1/organization/delete-user/:adminId ";
export const verifySessionRoute = "/v1/organization/verify-session";
export const orgRegisterRoute = "/v1/organization/register ";
export const orgProfileRoute = "/v1/organization/profile ";
export const org2fa = "/v1/organization/2fa";
export const orgUpdateProfile = "/v1/organization/profile ";
export const getParticipantRoute = "/v1/participant/ ";
export const participantPostRoute = "/v1/participant/participant-posts ";
export const getParticipantByIdRoute = "/v1/participant/participant-by-campaign-id";
export const getCampaignParticipantsRoute = "/v1/participant/campaign-participants ";
export const getParticipantMetricsRoute = "/v1/participant/participant-metrics";
export const getAccumulatedParticipantMetricsRoute = " /v1/participant/accumulated-user-metrics";
export const getAccumulatedUserMetricsRoute = "/v1/participant/accumulated-user-metrics";
export const getParticipantBlacklistById = "/v1/participant/blacklist/:id";
export const getAllParticipantsRoute = "/v1/participant/all";
export const getParticipantStatisticsRoute = "/v1/participant/statistics";
export const getParticipantTrackActionRoute = "/v1/participant/track-action";
export const getSocialMetricsRoute = "/v1/social/social-metrics";
export const registerSocialLinkRoute = "/v1/social/register-social-link";
export const postToSocialRoute = "/v1/social/post-to-social";
export const socialTypeRoute = " /v1/social/:type";
export const userSocialPostTimeRoute = "/v1/social/user-social-post-time ";
export const postContentGloballyRoute = "/v1/social/post-content-globally";
export const registerTiktokRoute = "/v1/social/register-tiktok";
export const getSocialPostRoute = "/v1/social/posts";
export const getSocialCampaign = "/v1/social/posts/:campaignId";
export const getCampaignScore = "/v1/social/campaign-score/:campaignId";
export const paymentMethodsRoute = "/v1/stripe/payment-methods";
export const purchaseCoiinRoute = "/v1/stripe/purchase-coiin";
export const addPaymentMethodRoute = "/v1/stripe/add-payment-method";
export const removePaymentMethodRoute = "/v1/stripe/remove-payment-method";
export const supportedCurrenciesRoute = "/v1/tatum/supported-currencies";
export const depositAddressRoute = "/v1/tatum/deposit-address";
export const tatumwithdraw = "/v1/tatum/withdraw ";
export const tatumAdminWithdraw = "/v1/tatum/admin/withdraw ";
export const transferCoiins = "/v1/tatum/transfer-coiins";
export const userRoute = "/v1/user/";
export const userMeRoute = "/v1/user/me";
export const participationtKeywordsRoute = "/v1/user/me/participation-keywords";
export const balancesRoute = "/v1/user/me/balances";
export const notificationSettingsRoute = "/v1/user/me/notification-settings";
export const userMetricsRoute = "/v1/user/user-metrics";
export const coiinAddressRoute = "/v1/user/me/coiin-address ";
export const transferHistory = "/v1/user/me/transfer-history";
export const followerCountRoute = "/v1/user/me/follower-count ";
export const usersRecordRoute = "/v1/user/users-record";
export const userBalancesRouteRoute = "/v1/user/user-balances/:userId";
export const updateUserStatusRoute = "/v1/user/update-user-status";
export const userParticipateRoute = "/v1/user/participate";
export const removeParticipationRoute = "/v1/user/remove-participation/:campaignId";
export const userTransactionsHistoryRoute = "/v1/user/user-transactions-history";
export const userStats = "/v1/user/user-stats";
export const usersRoute = " /v1/user/";
export const deleteUserById = "/v1/user/delete-user-by-id/:userId";
export const resetUserPasswordRoute = "/v1/user/reset-user-password/:userId";
export const singleUserRoute = "/v1/user/single-user/:userId ";
export const transferUserCoiin = "/v1/user/transfer-user-coiin ";
export const weeklyRewardsRoute = "/v1/user/weekly-rewards";
export const updateProfileInterestRoute = " /v1/user/update-profile-interests";
export const removeProfileInterestsRoute = " /v1/user/remove-profile-interests ";
export const rewardUserForSharingRoute = "/v1/user/reward-user-for-sharing";
export const updateUserPassword = "/v1/user/update-user-password";
export const updateUserName = "/v1/user/update-user-name/:username";
export const promotePermissionsRoute = "/v1/user/promote-permissions ";
export const setRecoveryCodeRoute = "/v1/user/set-recovery-code";
export const updateNotificationSettingsRoute = "/v1/user/update-notification-settings";
export const setDeviceRoute = "/v1/user/set-device ";
export const startEmailVerificationRoute = "/v1/user/start-email-verification";
export const completeEmailVerificationRoute = "/v1/user/complete-email-verification";
export const uploadProfilePicture = "/v1/user/upload-profile-picture";
export const recordRoute = "/v1/user/record ";
export const actionLogsRoute = "/v1/user/action-logs";
export const logoutRoute = "/v1/user/logout";
export const nftsRoute = "/v1/user/nfts";
export const withdrawRoute = "/v1/withdraw/";
export const withdrawHistory = "/v1/withdraw/history";
export const xoxodayVoucherRoute = "/v1/xoxoday/voucher";
export const redemptionRequirementsRoute = "/v1/xoxoday/redemption-requirements";
export const getRedemptionRequirementsRoute = "/v1/xoxoday/redemption-requirements/:userId ";
export const xoxodayOrderRoute = "/v1/xoxoday/order";

export function handleBaseAssertions(
    res: any,
    statusCode: number | undefined | null,
    message: string | undefined | null,

    ...args: jest.SpyInstance[]
) {
    // [res.body.status] is only defined when response is not successful - !200
    if (res.body.status) expect(res.body.status).toEqual(statusCode);
    // otherwise
    else if ((res.status as Object).toString().startsWith("2")) expect(res.body.success).toBe(true);

    if (message) expect(res.body.message).toContain(message);
    args.forEach((spy) => {
        expect(spy).toHaveBeenCalled();
    });
}

// helper models

// export const testOrg = (): Org => {
//     return {
//         id: "id",
//         name: "name",
//         stripeId: "id",
//         logo: "logo",
//         campaigns: [],
//         transfers: [],
//         admins: [],
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         hourlyMetrics: [],
//         asV1: () => org,
//         updateBalance: async (currency, operation, amount) => {},
//         getAvailableBalance: async (token) => 3,
//         hasId: () => true,
//         save: async (options) => org,
//         remove: async (options) => org,
//         softRemove: async (options) => org,
//         recover: async (options) => org,
//         reload: async () => {},
//         wallet: testWallet,
//     };
// };

// const user = (): User => {
//     return {
//         email: "email@raiinmaker.com",
//         password: "password",
//         referralCode: "code",
//         active: true,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         identityId: "identityId",
//         id: "id",
//         kycStatus: KycStatus.APPROVED,
//         lastLogin: new Date(),
//         deletedAt: new Date(),
//         promoCode: "code",
//         posts: [],
//         kycStatusDetails: "details",
//         campaigns: [],
//         wallet: testWallet,
//         addresses: [],
//         socialLinks: [],
//         identityVerification: [],
//         factorLinks: [],
//         twentyFourHourMetrics: [],
//         profile: testProfile,
//         notificationSettings: notificationSettings,
//         dailyMetrics: [],
//         admins: [],
//         orders: [],
//         nfts: [],
//         nameToUpperCase: () => {},
//         asV1: () => {},
//         asV2: async () => {},
//         hasKycApproved: async () => true,
//         updateCoiinBalance: async (operation) => {},
//         transferCoiinReward: async (data) => {},
//         updateLastLogin: async () => testUser,
//         updateEmailPassword: async (email, password) => testUser,
//         updateEmail: async (email) => testUser,
//         hasId: () => true,
//         save: async (options) => testUser,
//         remove: async (options) => testUser,
//         softRemove: async (options) => testUser,
//         recover: async (options) => testUser,
//         reload: async () => {},
//     };
// };

// export const testWallet: Wallet = {
//     id: "id",
//     walletCurrency: [],
//     org: testOrg(),
//     user: user(),
//     addresses: [],
//     currency: [],
//     custodialAddress: [],
//     escrows: [],
//     transfers: [],
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     asV1: (pendingBalance: string) => testWallet,
//     hasId: () => true,
//     save: async (options) => testWallet,
//     remove: async (options) => testWallet,
//     softRemove: async (options) => testWallet,
//     recover: async (options) => testWallet,
//     reload: async () => {},
// };

// export const org: Org = {
//     id: "id",
//     name: "name",
//     stripeId: "id",
//     logo: "logo",
//     campaigns: [],
//     transfers: [],
//     admins: [],
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     hourlyMetrics: [],
//     asV1: () => org,
//     updateBalance: async (currency, operation, amount) => {},
//     getAvailableBalance: async (token) => 3,
//     hasId: () => true,
//     save: async (options) => org,
//     remove: async (options) => org,
//     softRemove: async (options) => org,
//     recover: async (options) => org,
//     reload: async () => {},
//     wallet: testWallet,
// };

// export const testProfile: Profile = {
//     id: "id",
//     username: "username",
//     recoveryCode: "recoveryCode",
//     deviceToken: "deviceToken",
//     email: "email",
//     profilePicture: "profilePicture",
//     ageRange: "ageRange",
//     city: "city",
//     state: "state",
//     country: "country",
//     createdAt: new Date(),
//     deletedAt: new Date(),
//     updatedAt: new Date(),
//     platforms: [],
//     interests: [],
//     values: [],
//     user: user(),
//     isRecoveryCodeValid: (code) => true,
//     hasId: () => true,
//     save: async (options) => testProfile,
//     remove: async (options) => testProfile,
//     softRemove: async (options) => testProfile,
//     recover: async (options) => testProfile,
//     reload: async () => {},
// };

// export const notificationSettings: NotificationSettings = {
//     id: "id",
//     kyc: true,
//     withdraw: true,
//     campaignCreate: true,
//     campaignUpdates: true,
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     user: user(),
//     hasId: () => true,
//     save: async (options) => notificationSettings,
//     remove: async (options) => notificationSettings,
//     softRemove: async (options) => notificationSettings,
//     recover: async (options) => notificationSettings,
//     reload: async () => {},
// };

// export const testUser: User = {
//     email: "email@raiinmaker.com",
//     password: "password",
//     referralCode: "code",
//     active: true,
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     identityId: "identityId",
//     id: "id",
//     kycStatus: KycStatus.APPROVED,
//     lastLogin: new Date(),
//     deletedAt: new Date(),
//     promoCode: "code",
//     posts: [],
//     kycStatusDetails: "details",
//     campaigns: [],
//     wallet: testWallet,
//     addresses: [],
//     socialLinks: [],
//     identityVerification: [],
//     factorLinks: [],
//     twentyFourHourMetrics: [],
//     profile: testProfile,
//     notificationSettings: notificationSettings,
//     dailyMetrics: [],
//     admins: [],
//     orders: [],
//     nfts: [],
//     nameToUpperCase: () => {},
//     asV1: () => {},
//     asV2: async () => {},
//     hasKycApproved: async () => true,
//     updateCoiinBalance: async (operation) => {},
//     transferCoiinReward: async (data) => {},
//     updateLastLogin: async () => testUser,
//     updateEmailPassword: async (email, password) => testUser,
//     updateEmail: async (email) => testUser,
//     hasId: () => true,
//     save: async (options) => testUser,
//     remove: async (options) => testUser,
//     softRemove: async (options) => testUser,
//     recover: async (options) => testUser,
//     reload: async () => {},
// };
