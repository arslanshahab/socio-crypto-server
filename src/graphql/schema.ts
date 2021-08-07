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
            cryptoId: String
            company: String
            algorithm: String!
            requirements: JSON
            image: String
            sharedMedia: String
            tagline: String
            suggestedPosts: [String]
            suggestedTags: [String]
            keywords: [String]
            type: String
            rafflePrize: JSON
        ): CampaignCreationResponse
        newCampaignImages(id: String, image: String, sharedMedia: String, sharedMediaFormat: String): Campaign
        updateCampaign(
            id: String!
            name: String
            coiinTotal: Float
            target: String
            targetVideo: String
            beginDate: String
            endDate: String
            description: String
            image: String
            requirements: JSON
            suggestedPosts: [String]
            suggestedTags: [String]
        ): Campaign
        generateCampaignAuditReport(campaignId: String!): AuditReport
        payoutCampaignRewards(campaignId: String!, rejected: [String]!): Boolean
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
        ): String
        setDevice(deviceToken: String!): Boolean
        registerFactorLink(factor: JSON): User
        updateUsername(username: String!): User
        removeFactorLink(factorId: String!): User
        registerKyc(userKyc: JSON!): KycUser
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
    }

    type Query {
        getCurrentCampaignTier(campaignId: String!): CurrentTier
        getCampaignSignedUrls(
            id: String
            campaignImageFileName: String
            sharedMediaFileName: String
        ): CampaignCreationResponse
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
        getKyc: KycUser
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
        listEmployees: [Employee]
        listPaymentMethods: [PaymentMethod]
        listPendingCampaigns(skip: Int, take: Int): PaginatedCampaignResults
        listSupportedCrypto: [CryptoCurrency]
        getTokenInUSD(symbol: String!): Float
        getTokenIdBySymbol(symbol: String!): String
        checkCoinGecko(symbol: String): Boolean
        getWeeklyRewards: WeeklyRewardResponse
    }

    type WeeklyRewardResponse {
        loginRewardRedeemed: Boolean
        loginReward: Int
        nextLoginReward: String
        participationReward: Int
        participationId: String
        nextParticipationReward: String
        participationRewardRedeemed: Boolean
    }

    type CampaignCreationResponse {
        campaignId: String
        campaignImageSignedURL: String
        sharedMediaSignedURL: String
        raffleImageSignedURL: String
    }

    type StoreVoucher {
        productId: String
        name: String
        imageUrl: String
        countryName: String
        countryCode: String
        currencyCode: String
        exchangeRate: String
        valueDenominations: [String]
    }

    type StoreOrder {
        poNumber: String
        productId: String
        quantity: Int
        denomination: Int
        cartId: String
        coiinPrice: String
        name: String
        imageUrl: String
        countryName: String
        countryCode: String
        currencyCode: String
        exchangeRate: String
    }

    type OrderConfirmation {
        orderId: String
    }

    type Org {
        id: String
        name: String
        stripeId: String
        createdAt: String
        updatedAt: String
    }

    type PaymentMethod {
        id: String
        last4: String
        brand: String
    }

    type Employee {
        name: String
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
        id: String
        usdAmount: Float
        amount: Float
        action: String
        status: String
        withdrawStatus: String
        ethAddress: String
        currency: String
        paypalAddress: String
        campaign: Campaign
        createdAt: String
        updatedAt: String
        wallet: Wallet
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
        currentTier: Int
        currentTotal: Float
        campaignType: String
        tokenValueUsd: String
        tokenValueCoiin: String
    }

    type UserExistence {
        exists: Boolean
    }

    type User {
        id: String
        email: String
        username: String
        profilePicture: String
        campaigns: [Participant]
        wallet: Wallet
        hasRecoveryCodeSet: Boolean
        identityId: String
        kycStatus: String
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

    type PublicUser {
        id: String
        username: String
        ageRange: String
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
        id: String
        pendingBalance: String
        currency: [WalletCurrency]
        transfers: [Transfer]
    }

    type PaginatedUserResults {
        results: [User]
        total: Int
    }

    type PaginatedCampaignResults {
        results: [Campaign]
        total: Int
    }

    type PaginatedSocialPostResults {
        results: [SocialPost]
    }

    type Campaign {
        id: String
        name: String
        beginDate: String
        endDate: String
        coiinTotal: Float
        status: String
        totalParticipationScore: Float
        target: String
        description: String
        company: String
        algorithm: JSON
        audited: Boolean
        targetVideo: String
        imagePath: String
        sharedMedia: String
        sharedMediaFormat: String
        tagline: String
        requirements: JSON
        suggestedPosts: [String]
        createdAt: String
        keywords: [String]
        suggestedTags: [String]
        participants: [Participant]
        type: String
        prize: RafflePrize
        org: Org
        crypto: CryptoCurrency
    }

    type CryptoCurrency {
        type: String
        contractAddress: String
    }

    type RafflePrize {
        id: String
        displayName: String
        affiliateLink: String
        image: Boolean
    }

    type Participant {
        id: String
        metrics: ParticipantMetrics
        user: PublicUser
        campaign: Campaign
        link: String
        participationScore: Float
    }

    type SocialPost {
        id: String
        type: String
        likes: Int
        shares: Int
        comments: Int
        participantId: String
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
    }

    type AuditReport {
        totalViews: Int
        totalClicks: Int
        totalSubmissions: Int
        totalRewardPayout: Float
        flaggedParticipants: [ParticipantAudit]
    }
`;
