// POST             │ /v1/auth/register-user                          │ AuthenticationController.registerUser()                  │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/auth/user-login                             │ AuthenticationController.loginUser()                     │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/auth/reset-user-password                    │ AuthenticationController.resetUserPassword()             │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/auth/recover-user-account-step1             │ AuthenticationController.recoverUserAccountStep1()       │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/auth/recover-user-account-step2             │ AuthenticationController.recoverUserAccountStep2()       │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/auth/start-verification                     │ AuthenticationController.startVerification()             │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/auth/complete-verification                  │ AuthenticationController.completeVerification()          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/auth/username-exists                        │ AuthenticationController.usernameExists()                │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/auth/update-admin-password                  │ AuthenticationController.updateAdminPassword()           │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/auth/reset-password                         │ AuthenticationController.forgetAdminPassword()           │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/auth/start-admin-verification               │ AuthenticationController.startAdminVerification()        │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/auth/admin-login                            │ AuthenticationController.adminLogin()                    │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/campaign/                                   │ CampaignController.list()                                │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/campaign/one/:id                            │ CampaignController.getOne()                              │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/campaign/current-campaign-tier              │ CampaignController.getCurrentCampaignTier()              │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/campaign/campaign-metrics                   │ CampaignController.getCampaignMetrics()                  │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/campaign/create-campaign                    │ CampaignController.createCampaign()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/campaign/update-campaign                    │ CampaignController.updateCampaign()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/campaign/delete-campaign                    │ CampaignController.deleteCampaign()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/campaign/payout-campaign-rewards            │ CampaignController.payoutCampaignRewards()               │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/campaign/generate-campaign-audit-report     │ CampaignController.generateCampaignAuditReport()         │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/campaign/dashboard-metrics/:campaignId      │ CampaignController.getDashboardMetrics()                 │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/campaign/campaigns-lite                     │ CampaignController.getCampaignsLite()                    │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/campaign/pending                            │ CampaignController.updatePendingCampaignStatus()         │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/campaign/payout/:campaignId                 │ CampaignController.getPayout()                           │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/crypto/supported-crypto                     │ CryptoController.listSupportedCrypto()                   │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/crypto/add-to-wallet                        │ CryptoController.addCryptoToWallet()                     │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ DELETE           │ /v1/crypto/delete-from-wallet                   │ CryptoController.deleteCryptoFromWallet()                │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/funding-wallet/                             │ FundingWalletController.getFundingWallet()               │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/funding-wallet/transaction-history          │ FundingWalletController.transactionHistory()             │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/kyc/                                        │ KycController.get()                                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/kyc/download                                │ KycController.download()                                 │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/kyc/admin/:userId                           │ KycController.getAdmin()                                 │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/kyc/verify/level1                           │ KycController.verifyKycLevel1()                          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/kyc/verify/level2                           │ KycController.verifyKycLevel2()                          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/kyc/update-kyc                              │ KycController.updateKyc()                                │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/kyc/update-kyc-status                       │ KycController.updateKycStatus()                          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/kyc/verify-admin                            │ KycController.verifyAdmin()                              │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/kyc/webhook                                 │ KycController.kycWebhook()                               │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/organization/list-employees                 │ OrganizationController.listEmployees()                   │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/organization/org-details                    │ OrganizationController.getOrgDetails()                   │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/organization/new-user                       │ OrganizationController.newUser()                         │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/organization/delete-user/:adminId           │ OrganizationController.deleteUser()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/organization/verify-session                 │ OrganizationController.getUserRole()                     │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/organization/register                       │ OrganizationController.newOrg()                          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/organization/profile                        │ OrganizationController.getProfile()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/organization/2fa                            │ OrganizationController.twoFactorAuth()                   │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/organization/profile                        │ OrganizationController.updateProfile()                   │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/participant/                                │ ParticipantController.getParticipant()                   │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/participant/participant-posts               │ ParticipantController.getParticipantPosts()              │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/participant/participant-by-campaign-id      │ ParticipantController.getParticipantByCampaignId()       │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/participant/campaign-participants           │ ParticipantController.getCampaignParticipants()          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/participant/participant-metrics             │ ParticipantController.getParticipantMetrics()            │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/participant/accumulated-participant-metrics │ ParticipantController.getAccumulatedParticipantMetrics() │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/participant/accumulated-user-metrics        │ ParticipantController.getAccumulatedUserMetrics()        │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/participant/blacklist/:id                   │ ParticipantController.blacklistParticipant()             │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/participant/all                             │ ParticipantController.getParticipants()                  │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/participant/statistics                      │ ParticipantController.userStatistics()                   │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/participant/track-action                    │ ParticipantController.trackAction()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/social/social-metrics                       │ SocialController.getSocialMetrics()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/social/register-social-link                 │ SocialController.registerSocialLink()                    │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/social/post-to-social                       │ SocialController.postToSocial()                          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ DELETE           │ /v1/social/:type                                │ SocialController.removeSocialLink()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/social/user-social-post-time                │ SocialController.getUserSocialPostTime()                 │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/social/post-content-globally                │ SocialController.postContentGlobally()                   │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/social/register-tiktok                      │ SocialController.registerTiktokSocialLink()              │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/social/posts                                │ SocialController.getCampaignPosts()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/social/posts/:campaignId                    │ SocialController.getCampaignPostsByCampaignId()          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/social/campaign-score/:campaignId           │ SocialController.getCampaignScore()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/stripe/payment-methods                      │ StripeController.listPaymentMethods()                    │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/stripe/purchase-coiin                       │ StripeController.purchaseCoiin()                         │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/stripe/add-payment-method                   │ StripeController.addPaymentMethod()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ DELETE           │ /v1/stripe/remove-payment-method                │ StripeController.removePaymentMethod()                   │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/tatum/supported-currencies                  │ TatumController.getSupportedCurrencies()                 │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/tatum/deposit-address                       │ TatumController.getDepositAddress()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/tatum/withdraw                              │ TatumController.withdraw()                               │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/tatum/admin/withdraw                        │ TatumController.withdrawOrgFunds()                       │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/tatum/transfer-coiins                       │ TatumController.transferCoiin()                          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/                                       │ UserController.list()                                    │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/me                                     │ UserController.me()                                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/me/participation-keywords              │ UserController.getParticipationKeywords()                │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/me/balances                            │ UserController.getBalances()                             │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/me/notification-settings               │ UserController.getNotificationSettings()                 │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/user-metrics                           │ UserController.getUserMetrics()                          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/me/coiin-address                       │ UserController.getCoiinAddress()                         │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/me/transfer-history                    │ UserController.getTransferHistory()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/me/follower-count                      │ UserController.getFollowerCount()                        │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/users-record                           │ UserController.getUsersRecord()                          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/user-balances/:userId                  │ UserController.getUserBalances()                         │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/user/update-user-status                     │ UserController.updateUserStatus()                        │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/user/participate                            │ UserController.participate()                             │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ DELETE           │ /v1/user/remove-participation/:campaignId       │ UserController.removeParticipation()                     │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/user-transactions-history              │ UserController.getUserTransactionHistory()               │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/user-stats                             │ UserController.getDashboardStats()                       │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ DELETE           │ /v1/user/                                       │ UserController.deleteUser()                              │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/user/delete-user-by-id/:userId              │ UserController.deleteUserById()                          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/user/reset-user-password/:userId            │ UserController.resetUserPassword()                       │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/single-user/:userId                    │ UserController.getUserById()                             │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/user/transfer-user-coiin                    │ UserController.transferUserCoiin()                       │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/weekly-rewards                         │ UserController.getWeeklyRewards()                        │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/user/update-profile-interests               │ UserController.updateProfileInterests()                  │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/user/remove-profile-interests               │ UserController.removeProfileInterests()                  │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/user/reward-user-for-sharing                │ UserController.rewardUserForSharing()                    │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/user/update-user-password                   │ UserController.updateUserPassword()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/user/update-user-name/:username             │ UserController.updateUserName()                          │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/user/promote-permissions                    │ UserController.promotePermissions()                      │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/user/set-recovery-code                      │ UserController.setRecoveryCode()                         │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/user/update-notification-settings           │ UserController.updateNotificationSettings()              │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ PUT              │ /v1/user/set-device                             │ UserController.setDevice()                               │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/user/start-email-verification               │ UserController.startEmailVerification()                  │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/user/complete-email-verification            │ UserController.completeEmailVerification()               │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/user/upload-profile-picture                 │ UserController.uploadProfilePicture()                    │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/record                                 │ UserController.downloadUsersRecord()                     │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/action-logs                            │ UserController.actionLogs()                              │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/user/logout                                 │ UserController.logoutUser()                              │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/user/nfts                                   │ UserController.userNtfs()                                │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/withdraw/                                   │ WithdrawController.getWithdrawalsV2()                    │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/withdraw/history                            │ WithdrawController.getWithdrawalHistory()                │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/xoxoday/voucher                             │ XoxodayController.getStoreVouchers()                     │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/xoxoday/redemption-requirements             │ XoxodayController.getRedemptionRequirements()            │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ GET              │ /v1/xoxoday/redemption-requirements/:userId     │ XoxodayController.getRedemptionRequirementsByUserId()    │
// │──────────────────│─────────────────────────────────────────────────│──────────────────────────────────────────────────────────│
// │ POST             │ /v1/xoxoday/order                               │ XoxodayController.placeOrder()                           │

// AuthenticationController Routes
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

// CampaignController Routes
export const campaingRoute = "/v1/campaign/ ";
export const getOneCampaignRoute = "/v1/campaign/one/:id ";
export const currentCampaignTierRoute = "/v1/campaign/current-campaign-tier";
export const campaignMetricsRoute = "/v1/campaign/campaign-metrics";
export const createCampaignRoute = "/v1/campaign/create-campaign";
