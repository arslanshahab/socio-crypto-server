import { gql } from "apollo-server-express";

export const typeDefs = gql`
    scalar JSON

    type Mutation {
        newCampaign(
            name: String!
            coiinTotal: Float!
            target: String!
            targetVideo: String
            beginDate: String!
            endDate: String!
            description: String
            instructions: String
            symbol: String
            company: String
            algorithm: String!
            requirements: JSON
            imagePath: String
            campaignType: String
            socialMediaType: [String]
            tagline: String
            suggestedPosts: [String]
            suggestedTags: [String]
            keywords: [String]
            type: String
            rafflePrize: JSON
            campaignMedia: JSON
            campaignTemplates: JSON
            isGlobal: Boolean
            showUrl: Boolean!
        ): CampaignCreationResponse
        updateCampaign(
            id: String
            name: String!
            coiinTotal: Float!
            target: String!
            targetVideo: String
            beginDate: String!
            endDate: String!
            description: String
            instructions: String
            symbol: String
            isGlobal: Boolean
            showUrl: Boolean!
            company: String
            algorithm: String!
            requirements: JSON
            imagePath: String
            campaignType: String
            socialMediaType: [String]
            tagline: String
            suggestedPosts: [String]
            suggestedTags: [String]
            keywords: [String]
            type: String
            rafflePrize: JSON
            campaignMedia: JSON
            campaignTemplates: JSON
        ): CampaignCreationResponse
        generateCampaignAuditReport(campaignId: String!): AuditReport
        payoutCampaignRewards(campaignId: String!, rejected: [String]): SuccessResponse
        deleteCampaign(id: String!): Campaign
        participate(campaignId: String!, email: String): Participant
        removeParticipation(campaignId: String!): User
        trackAction(participantId: String!, action: String!): Participant
        promoteUserPermissions(userId: String, email: String, company: String, role: String): User
        registerSocialLink(type: String!, apiKey: String!, apiSecret: String!): Boolean
        removeSocialLink(type: String!): Boolean
        postToSocial(
            socialType: String!
            text: String!
            mediaType: String
            mediaFormat: String
            media: String
            participantId: String!
            defaultMedia: Boolean
            mediaId: String
        ): String
        postContentGlobally(
            socialType: String!
            text: String!
            mediaType: String
            mediaFormat: String
            media: String
        ): SuccessResponse
        setDevice(deviceToken: String!): Boolean
        registerFactorLink(factor: JSON): User
        updateUsername(username: String!): User
        removeFactorLink(factorId: String!): User
        verifyKyc(userKyc: KycApplication): KycApplicationResponse
        updateKyc(user: JSON!): KycUser
        initiateWithdraw(withdrawAmount: Float!, ethAddress: String, tokenSymbol: String): Transfer
        updateWithdrawStatus(transferIds: [String]!, status: String!): [Transfer]
        setRecoveryCode(code: Int!): User
        updateKycStatus(userId: String!, status: String!): User
        updateProfileInterests(
            city: String
            country: String
            state: String
            ageRange: String
            interests: [String]
            values: [String]
        ): User
        removeProfileInterests(
            interest: String
            value: String
            ageRange: String
            city: String
            state: String
            country: String
        ): User
        generateFactorsFromKyc(factors: [JSON]): JSON
        attachEthereumAddress(ethereumAddress: String!): ExternalAddress
        claimEthereumAddress(ethereumAddress: String!, signature: String!): ExternalAddress
        removeEthereumAddress(ethereumAddress: String!): Boolean
        updateNotificationSettings(
            kyc: Boolean
            withdraw: Boolean
            campaignCreate: Boolean
            campaignUpdates: Boolean
        ): User
        newOrg(orgName: String!, email: String!, name: String!): JSON
        newUser(name: String!, email: String!, role: String!): Boolean
        updatePassword(password: String!): Boolean
        addPaymentMethod: Stripe
        purchaseCoiin(amount: Float!, paymentMethodId: String!, campaignId: String): Stripe
        updateCampaignStatus(status: String!, campaignId: String!): Boolean
        fundCampaigns(campaignIds: [String]): Boolean
        sendUserMessages(usernames: [String]!, title: String!, message: String!): Boolean
        uploadProfilePicture(image: String!): Boolean
        registerNewCrypto(name: String!, contractAddress: String): WalletCurrency
        addCryptoToWallet(contractAddress: String!): WalletCurrency
        deleteCryptoFromWallet(id: String!): String
        removePaymentMethod(paymentMethodId: String): Boolean
        placeStoreOrder(cart: [JSON], email: String): JSON
        withdrawFunds(
            symbol: String!
            network: String!
            address: String!
            amount: Float!
            verificationToken: String!
        ): SuccessResponse
        startVerification(email: String!, type: VerificationType!): SuccessResponse
        startEmailVerification(email: String!): SuccessResponse
        completeEmailVerification(email: String!, token: String!): SuccessResponse
        completeVerification(email: String!, code: String!): SuccessResponse
        loginUser(email: String!, password: String!): SuccessResponse
        registerUser(email: String!, username: String!, password: String!, verificationToken: String!): SuccessResponse
        resetUserPassword(password: String!, verificationToken: String!): SuccessResponse
        recoverUserAccountStep1(username: String!, code: String!): SuccessResponse
        recoverUserAccountStep2(
            email: String!
            password: String!
            userId: String!
            verificationToken: String!
        ): SuccessResponse
        updateUserPassword(oldPassword: String!, newPassword: String!): SuccessResponse
        registerTiktokSocialLink(
            open_id: String!
            access_token: String!
            expires_in: Int!
            refresh_token: String!
            refresh_expires_in: Int!
        ): SuccessResponse
    }

    type Query {
        getCurrentCampaignTier(campaignId: String!): CurrentTier
        getDepositAddressForSymbol(symbol: String): DepostAddressObject
        getSupportedCurrencies: [String]
        usernameExists(username: String!): UserExistence
        listCampaigns(
            open: Boolean
            skip: Int
            take: Int
            scoped: Boolean
            sort: Boolean
            approved: Boolean
            pendingAudit: Boolean
        ): PaginatedCampaignResults
        listCampaignsV2(skip: Int!, take: Int!, state: CampaignState!, status: CampaignStatus): PaginatedOpenCampaigns
        getUserParticipationKeywords: [String]
        getStoreVouchers(country: String, page: Int): [StoreVoucher]
        getCampaign(id: String): Campaign
        getParticipant(id: String): Participant
        getParticipantPosts(id: String): [String]
        getSocialMetrics(id: String!): SocialMetrics
        campaignGet(campaignId: String!): Campaign
        getParticipantByCampaignId(campaignId: String!): Participant
        getParticipantMetrics(participantId: String!): [ParticipantMetric]
        getUserMetrics(today: Boolean): [ParticipantMetric]
        listUsers(skip: Int, take: Int): PaginatedUserResults
        helloWorld: String
        isLastFactor: Boolean
        me(openCampaigns: Boolean): User
        meV2: UserV2
        getKyc: KycApplicationResponse
        getWalletWithPendingBalance(tokenSymbol: String): Wallet
        getWithdrawals(status: String): [AdminWithdrawal]
        accountExists(id: String!): UserExistence
        getCampaignMetrics(campaignId: String!): AdminCampaignMetrics
        getHourlyCampaignMetrics(
            campaignId: String!
            filter: String!
            startDate: String!
            endDate: String!
        ): [AdminHourlyCampaignMetrics]
        getHourlyPlatformMetrics(filter: String!, startDate: String!, endDate: String!): [AdminHourlyPlatformMetrics]
        getTotalPlatformMetrics: AdminCampaignMetrics
        getFollowerCount: FollowerCounts
        getPreviousDayMetrics: JSON
        getEstimatedGasPrice(symbol: String): String
        getExternalAddress(ethereumAddress: String!): ExternalAddress
        listExternalAddresses: [ExternalAddress]
        getWithdrawalsV2(status: String): [AdminWithdrawal]
        getWithdrawalHistory: [Transfer]
        adminGetKycByUser(userId: String!): KycUser
        verifySession: JSON
        getFundingWallet: FundingWallet
        listOrgs(skip: Int, take: Int): [Org]
        listEmployees(skip: Int, take: Int): EmployeeOrganization
        getOrgDetails: [OrgDetail]
        listPaymentMethods: [PaymentMethod]
        listPendingCampaigns(skip: Int, take: Int): PaginatedCampaignResults
        listSupportedCrypto: [CryptoCurrency]
        getTokenInUSD(symbol: String!): Float
        getTokenIdBySymbol(symbol: String!): String
        checkCoinGecko(symbol: String): Boolean
        getWeeklyRewards: WeeklyRewardEstimation
        getRedemptionRequirements: RedemptionRequirements
        getUserBalances: [UserBalance]
        getTransferHistory(symbol: String, skip: Int, take: Int): PaginatedTransferHistory
        getTransferHistoryV2(symbol: String, skip: Int, take: Int, type: String): PaginatedTransferHistory
        listAllCampaignsForOrg: [UserAllCampaigns]
        # downloadKyc(kycId: String!): [Factor]
        downloadKyc: KycApplicationResponse
        getDashboardMetrics(campaignId: String, skip: Int, take: Int): DashboardMetrics
        transactionHistory: [Transfer]
        getCampaignParticipants(campaignId: String): [Participant]
    }

    type DashboardMetrics {
        aggregatedCampaignMetrics: AggregatedCampaignMetrics
        campaignMetrics: [CampaignsMetrics]
    }
    type AggregatedCampaignMetrics {
        campaignName: String!
        clickCount: Int!
        viewCount: Int!
        shareCount: Int!
        participationScore: Int!
        totalParticipants: Int!
    }
    type CampaignsMetrics {
        clickCount: Int!
        viewCount: Int!
        shareCount: Int!
        participationScore: Int!
    }

    enum VerificationType {
        EMAIL
        PASSWORD
        WITHDRAW
    }

    enum CampaignState {
        ALL
        OPEN
        CLOSED
    }

    enum CampaignStatus {
        ALL
        ACTIVE
        PENDING
        INSUFFICIENT_FUNDS
        CLOSED
        APPROVED
        DENIED
    }

    type KycApplicationResponse {
        kycId: String!
        status: String!
        factors: FactorData
    }

    type FactorData {
        fullName: String
        email: String
        address: String
        isDocumentValid: Boolean
        documentDetails: JSON
    }

    input KycApplication {
        firstName: String!
        middleName: String!
        lastName: String!
        email: String!
        billingStreetAddress: String!
        billingCity: String!
        billingCountry: String!
        billingZip: Int
        gender: String!
        dob: String!
        phoneNumber: String!
        documentType: String!
        documentCountry: String!
        frontDocumentImage: String!
        faceImage: String!
        backDocumentImage: String!
    }

    type PaginatedTransferHistory {
        total: Int!
        results: [Transfer]
    }

    type DepostAddressObject {
        symbol: String!
        address: String!
        fromTatum: Boolean!
        memo: String
        message: String
        destinationTag: String
    }

    type UserBalance {
        symbol: String!
        balance: Float!
        minWithdrawAmount: Float
        usdBalance: String!
        imageUrl: String!
        network: String!
    }

    type SuccessResponse {
        success: Boolean!
        verificationToken: String
        userId: String
        token: String
        message: String
    }

    type RedemptionRequirements {
        accountAgeReached: Boolean!
        accountAge: Int!
        accountAgeRequirement: Int
        twitterLinked: Boolean!
        twitterfollowers: Int!
        twitterfollowersRequirement: Int!
        participation: Boolean!
        participationScore: Int
        participationScoreRequirement: Int
        orderLimitForTwentyFourHoursReached: Boolean!
    }

    type WeeklyRewardEstimation {
        loginRewardRedeemed: Boolean!
        loginReward: Int!
        nextLoginReward: String!
        participationReward: Int!
        participationId: String!
        nextParticipationReward: String!
        participationRewardRedeemed: Boolean!
        participationRedemptionDate: String!
        loginRedemptionDate: String!
        earnedToday: Float!
        sharingReward: Int!
    }

    type CampaignCreationResponse {
        campaignId: String!
        campaignImageSignedURL: String
        raffleImageSignedURL: String
        mediaUrls: [CampaignMediaSignedUrls]
    }

    type CampaignMediaSignedUrls {
        name: String
        channel: String
        signedUrl: String
    }

    type StoreVoucher {
        productId: String!
        name: String!
        imageUrl: String!
        countryName: String!
        countryCode: String!
        currencyCode: String!
        exchangeRate: String!
        valueDenominations: [String]!
    }

    type StoreOrder {
        poNumber: String!
        productId: String!
        quantity: Int!
        denomination: Int!
        cartId: String!
        coiinPrice: String!
        name: String!
        imageUrl: String!
        countryName: String!
        countryCode: String!
        currencyCode: String!
        exchangeRate: String!
    }

    type OrderConfirmation {
        orderId: String!
    }

    type Org {
        id: String!
        name: String!
        stripeId: String
        createdAt: String
        updatedAt: String
    }
    type OrgDetail {
        name: String!
        createdAt: String
        campaignCount: Int!
        adminCount: Int!
    }

    type PaymentMethod {
        id: String
        last4: String
        brand: String
    }

    type Employee {
        name: String!
        createdAt: String
    }
    type EmployeeOrganization {
        orgName: String
        adminsDetails: [Employee]
    }

    type Stripe {
        clientSecret: String
    }

    type NotificationSettings {
        kyc: Boolean
        withdraw: Boolean
        campaignCreate: Boolean
        campaignUpdates: Boolean
    }

    type FundingWallet {
        currency: [WalletCurrency]
        transfers: [Transfer]
    }

    type WalletCurrency {
        id: String
        type: String
        balance: Float
        symbolImageUrl: String
    }

    type ExternalAddress {
        ethereumAddress: String
        message: String
        claimed: Boolean
        balance: Float
    }

    type FactorGeneration {
        FactorName: String!
        FactorId: String!
    }

    type ParticipantMetric {
        id: String
        campaignId: String
        clickCount: Int
        viewCount: Int
        submissionCount: Int
        likeCount: Int
        shareCount: Int
        commentCount: Int
        participationScore: Float
        totalParticipationScore: Float
        participantId: String
        createdAt: String
        updatedAt: String
    }

    type AdminCampaignMetrics {
        clickCount: Int
        viewCount: Int
        submissionCount: Int
        postCount: Int
        likeCount: Int
        commentCount: Int
        shareCount: Int
        participantCount: Int
        discoveryCount: Int
        conversionCount: Int
    }

    type UserAllCampaigns {
        id: ID
        name: String
    }

    type AdminHourlyCampaignMetrics {
        interval: String
        postCount: Int
        participantCount: Int
        clickCount: Int
        viewCount: Int
        submissionCount: Int
        likeCount: Int
        shareCount: Int
        commentCount: Int
        totalDiscoveries: Int
        totalConversions: Int
        averagePostCost: Float
        averageDiscoveryCost: Float
        averageConversionCost: Float
    }

    type AdminHourlyPlatformMetrics {
        interval: String
        postCount: Int
        participantCount: Int
        clickCount: Int
        viewCount: Int
        submissionCount: Int
        likeCount: Int
        shareCount: Int
        commentCount: Int
        totalDiscoveries: Int
        totalConversions: Int
    }

    type AdminWithdrawal {
        user: User
        totalPendingWithdrawal: [JSON]
        totalAnnualWithdrawn: Float
        transfers: [Transfer]
        kyc: KycUser
    }

    type Transfer {
        id: String!
        usdAmount: Float
        amount: Float!
        action: String!
        status: String
        network: String
        withdrawStatus: String
        ethAddress: String
        currency: String
        paypalAddress: String
        campaign: Campaign
        createdAt: String
        updatedAt: String
        wallet: Wallet
        symbolImageUrl: String
    }

    type TwentyFourHourMetric {
        id: String
        score: Float
        createdAt: String
    }

    type SocialMetrics {
        totalLikes: Float
        totalShares: Float
        likesScore: Float
        shareScore: Float
    }

    type CurrentTier {
        currentTier: Int!
        currentTotal: Float!
        campaignType: String
        tokenValueUsd: String
        tokenValueCoiin: String
    }

    type UserExistence {
        exists: Boolean
    }

    type User {
        id: String!
        email: String!
        username: String!
        profilePicture: String
        campaigns: [Participant]
        wallet: Wallet!
        hasRecoveryCodeSet: Boolean
        identityId: String
        kycStatus: String!
        socialLinks: [SocialLink]
        factorLinks: [FactorLink]
        twentyFourHourMetrics: [TwentyFourHourMetric]
        ageRange: String
        city: String
        country: String
        state: String
        interests: [String]
        values: [String]
        notificationSettings: NotificationSettings
        orders: [JSON]
    }

    type UserV2 {
        id: String!
        email: String!
        username: String!
        profilePicture: String
        hasRecoveryCodeSet: Boolean
        kycStatus: String!
        socialLinks: [SocialLink]
        ageRange: String
        city: String
        country: String
        state: String
        interests: [String]
        values: [String]
        participations: [ParticipationData]
    }

    type ParticipationData {
        campaignId: String!
        currentlyParticipating: Boolean!
    }

    type KycUser {
        firstName: String
        lastName: String
        businessName: String
        address: JSON
        phoneNumber: String
        email: String
        paypalEmail: String
        idProof: String
        addressProof: String
        exceptions: String
        typeOfStructure: String
        accountNumbers: String
        ssn: String
        hasIdProof: Boolean
        hasAddressProof: Boolean
    }

    type KycResponse {
        kycId: String
        state: String
        factors: [Factor]
    }

    type Factor {
        id: String
        name: String
        hashType: String
        providerId: String
        signature: String
        factor: String
    }

    type FactorLink {
        factorId: String
        identityId: String
        providerId: String
        type: String
    }

    type SocialLink {
        type: String
    }

    type Wallet {
        id: String!
        pendingBalance: String
        walletCurrency: [WalletCurrency]
        transfers: [Transfer]
    }

    type PaginatedUserResults {
        results: [User]!
        total: Int!
    }

    type PaginatedCampaignResults {
        results: [Campaign]!
        total: Int!
    }

    type PaginatedOpenCampaigns {
        results: [Campaign]!
        total: Int!
    }

    type PaginatedSocialPostResults {
        results: [SocialPost]
    }

    type Campaign {
        id: String!
        name: String!
        beginDate: String!
        endDate: String!
        coiinTotal: Float!
        coiinTotalUSD: Float!
        status: String!
        symbol: String!
        isGlobal: Boolean
        showUrl: Boolean!
        symbolImageUrl: String!
        totalParticipationScore: Float
        target: String
        description: String!
        instructions: String!
        company: String
        algorithm: JSON!
        audited: Boolean!
        targetVideo: String
        imagePath: String!
        campaignType: String!
        socialMediaType: [String]!
        tagline: String
        requirements: JSON
        suggestedPosts: [String]
        createdAt: String
        keywords: [String]!
        suggestedTags: [String]
        participants: [Participant]
        type: String!
        prize: RafflePrize
        org: Org
        crypto: CryptoCurrency
        campaignMedia: [CampaignMedia]
        campaignTemplates: [CampaignTemplate]
    }

    type CampaignMedia {
        id: String!
        channel: String!
        isDefault: Boolean!
        media: String!
        mediaFormat: String!
        createdAt: String!
        updatedAt: String!
    }

    type CampaignTemplate {
        id: String!
        channel: String!
        post: String!
        createdAt: String!
        updatedAt: String!
    }

    type CryptoCurrency {
        type: String!
        contractAddress: String
    }

    type RafflePrize {
        id: String
        displayName: String
        affiliateLink: String
        image: Boolean
    }

    type Participant {
        id: String!
        metrics: ParticipantMetrics
        user: User!
        campaign: Campaign!
        link: String
        participationScore: Float
    }

    type SocialPost {
        id: String!
        type: String!
        likes: Int!
        shares: Int!
        comments: Int!
        participantId: String!
    }

    type ParticipantMetrics {
        viewCount: Int
        clickCount: Int
        submissionCount: Int
        participationScore: Float
    }

    type ParticipantAudit {
        participantId: String
        viewPayout: Float
        clickPayout: Float
        submissionPayout: Float
        totalPayout: Float
    }

    type FollowerCounts {
        twitter: Int
        facebook: Int
        tiktok: Int
    }

    type AuditReport {
        totalViews: Int
        totalClicks: Int
        totalSubmissions: Int
        totalRewardPayout: Float
        flaggedParticipants: [ParticipantAudit]
    }
`;
