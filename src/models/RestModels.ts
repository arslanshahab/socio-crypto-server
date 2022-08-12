import Prisma, { CampaignMedia, CampaignTemplate, RafflePrize } from "@prisma/client";
import { ArrayOf, CollectionOf, Nullable, Optional, Property, Required } from "@tsed/schema";
import { getCryptoAssestImageUrl } from "../util";
import { KycLevel, SharingRewardType } from "../util/constants";
import { KycStatus } from "../types";

export class CampaignMediaResultModel {
    @Property() public readonly id: string;
    @Property(Date) public readonly createdAt: Date;
    @Property(Date) public readonly updatedAt: Date;
    @Nullable(String) public readonly channel: string | null;
    @Nullable(String) public readonly media: string | null;
    @Nullable(String) public readonly mediaFormat: string | null;
    @Nullable(Boolean) public readonly isDefault: boolean | null;
}

export class CampaignTemplateResultModel {
    @Property() public readonly id: string;
    @Property(Date) public readonly createdAt: Date;
    @Property(Date) public readonly updatedAt: Date;
    @Nullable(String) public readonly channel: string | null;
    @Nullable(String) public readonly post: string | null;
}

export class ParticipantResultModel {
    @Property() public readonly id: string;
    @Property() public readonly campaignId: string;
    @Property() public readonly participationScore: string;
    @Nullable(String) public readonly link: string | null;

    @Property() public readonly currentlyParticipating: boolean;

    public static build(participant: Prisma.Participant & { campaign: Prisma.Campaign }): ParticipantResultModel {
        const now = new Date();
        const currentlyParticipating =
            new Date(participant.campaign.beginDate).getTime() <= now.getTime() &&
            new Date(participant.campaign.endDate).getTime() >= now.getTime();

        return { ...participant, currentlyParticipating };
    }
}

export class CampaignResultModel {
    @Property() public readonly id: string;
    @Property() public readonly name: string;
    @Property(Date) public readonly beginDate: Date;
    @Property(Date) public readonly endDate: Date;
    @Property() public readonly coiinTotal: string;
    @Property() public readonly status: string;
    @Property() public readonly isGlobal: boolean;
    @Property() public readonly showUrl: boolean;
    @Property() public readonly target: string;
    @Property(Date) public readonly createdAt: Date;
    @Property(Date) public readonly updatedAt: Date;
    @Nullable(String) public readonly description: string | null;
    @Nullable(String) public readonly instructions: string | null;
    @Property() public readonly company: string;
    @Property() public readonly algorithm: any;
    @Property() public readonly audited: boolean;
    @Nullable(String) public readonly targetVideo: string | null;
    @Nullable(String) public readonly imagePath: string | null;
    @Nullable(String) public readonly campaignType: string | null;
    @Nullable(String) public readonly tagline: string | null;
    @Nullable(Object) public readonly requirements: any | null;
    @Nullable(String) public readonly cryptoId: string | null;
    @Nullable(String) public readonly type: string | null;
    @Optional() @CollectionOf(ParticipantResultModel) public readonly participant?: ParticipantResultModel[];
    @CollectionOf(CampaignMediaResultModel) public readonly campaign_media: CampaignMediaResultModel[];
    @CollectionOf(CampaignTemplateResultModel) public readonly campaign_template: CampaignTemplateResultModel[];

    @Property() public coiinTotalUSD?: string;
    @Property() public network?: string;
    @Property() public symbol?: string;
    @Property() public symbolImageUrl?: string;

    @Property(Number) public totalParticipationScore: string | number; // this property is stored as a string in the db, but is parsed into a number when returned from the API
    // these properties are stored as a string in the db, but are parsed into an array when returned from the API
    @ArrayOf(String) public socialMediaType?: string | string[];
    @ArrayOf(String) public keywords?: string | string[];
    @ArrayOf(String) public suggestedPosts?: string | string[];
    @ArrayOf(String) public suggestedTags?: string | string[];

    public static async build(
        campaign: Prisma.Campaign & {
            participant?: Prisma.Participant[];
            currency: (Prisma.Currency & { token: Prisma.Token | null }) | null;
            crypto_currency: Prisma.CryptoCurrency | null;
            campaign_media: Prisma.CampaignMedia[];
            campaign_template: Prisma.CampaignTemplate[];
        },
        coiinTotalUSD: number
    ) {
        const result: CampaignResultModel = {
            ...campaign,
            participant: campaign.participant?.map((participant) =>
                ParticipantResultModel.build({ ...participant, campaign })
            ),
        };

        result.coiinTotalUSD = result.coiinTotal ? coiinTotalUSD.toFixed(2) : "0";

        if (campaign.currency) {
            result.network = campaign.currency.token?.network || "";
            result.symbol = campaign.currency.token?.symbol || "";
            result.symbolImageUrl = getCryptoAssestImageUrl(campaign.currency?.token?.symbol || "");
        }

        result.totalParticipationScore = parseInt(campaign.totalParticipationScore);
        if (campaign.socialMediaType) result.socialMediaType = JSON.parse(campaign.socialMediaType);
        if (campaign.keywords) result.keywords = JSON.parse(campaign.keywords);
        if (campaign.suggestedPosts) result.suggestedPosts = JSON.parse(campaign.suggestedPosts);
        if (campaign.suggestedTags) result.suggestedTags = JSON.parse(campaign.suggestedTags);

        return result;
    }
}

export class CurrentCampaignTierModel {
    @Property() public currentTier: number;
    @Property() public currentTotal: number;
    @Nullable(String) public campaignType: string | null;
    @Nullable(String) public tokenValueUsd: string | null;
    @Nullable(String) public tokenValueCoiin: string | null;
}
export class ParticipantPostModel {
    @Property() public readonly results: string[];
}

export class NotificationSettingsResultModel {
    @Property() public readonly id: string;
    @Property() public readonly kyc: boolean;
    @Property() public readonly withdraw: boolean;
    @Property() public readonly campaignCreate: boolean;
    @Property() public readonly campaignUpdates: boolean;
    @Nullable(String) public readonly userId: string | null;
}

export class ProfileResultModel {
    @Property() public readonly username: string;
    @Nullable(String) public readonly email: string | null;
    @Nullable(String) public readonly ageRange: string | null;
    @Nullable(String) public readonly city: string | null;
    @Nullable(String) public readonly state: string | null;
    @Nullable(String) public readonly country: string | null;
    @Nullable(String) public readonly profilePicture: string | null;

    @Property() public hasRecoveryCodeSet: boolean;
    // these properties are stored as a string in the db, but are parsed into an array when returned from the API
    @ArrayOf(String) public interests: string[];
    @ArrayOf(String) public values: string[];

    public static build(profile: Prisma.Profile): ProfileResultModel {
        return {
            ...profile,
            hasRecoveryCodeSet: !!profile?.recoveryCode,
            interests: JSON.parse(profile.interests),
            values: JSON.parse(profile.values),
        };
    }
}

export class RafflePrizeResultModel {
    @Property() public readonly id: string;
    @Property() public readonly displayName: string;
    @Nullable(Boolean) public readonly image: boolean | null;
    @Nullable(String) public readonly affiliateLink: string | null;
}

export class SocialLinkResultModel {
    @Property() public readonly type: string;
}

export class WalletCurrencyResultModel {
    @Property() public readonly id: string;
    @Property() public readonly type: string;
    @Property() public readonly balance: string;
}

export class TransferResultModel {
    @Property() public readonly id: string;
    @Property() public readonly amount: string;
    @Property() public readonly action: string;
    @Property(Date) public readonly createdAt: Date;
    @Property(Date) public readonly updatedAt: Date;
    @Nullable(String) public readonly campaignId: string | null;
    @Nullable(String) public readonly rafflePrizeId: string | null;
    @Nullable(String) public readonly walletId: string | null;
    @Nullable(String) public readonly status: string | null;
    @Nullable(String) public readonly usdAmount: string | null;
    @Nullable(String) public readonly ethAddress: string | null;
    @Nullable(String) public readonly paypalAddress: string | null;
    @Nullable(String) public readonly currency: string | null;
    @Nullable(String) public readonly transactionHash: string | null;

    @Property() public symbolImageUrl?: string;

    public static build(transfer: Prisma.Transfer): TransferResultModel {
        return {
            ...transfer,
            symbolImageUrl: transfer.currency ? getCryptoAssestImageUrl(transfer.currency) : undefined,
            action: transfer.action?.toUpperCase() || "",
            status: transfer.status?.toUpperCase() || "",
        };
    }
    public static buildArray(transfer: Prisma.Transfer[]): TransferResultModel[] {
        return transfer.map((transfer) => TransferResultModel.build(transfer));
    }
}

export class WalletResultModel {
    @Property() public readonly id: string;
    @CollectionOf(TransferResultModel) public readonly transfer: TransferResultModel[];
    @CollectionOf(WalletCurrencyResultModel) public readonly wallet_currency: WalletCurrencyResultModel[];

    @Property() public pendingBalance?: string;
}

export class XoxodayOrderResultModel {
    @Property() public readonly id: string;
    @Property() public readonly orderTotal: string;
    @Property() public readonly currencyCode: string;
    @Property() public readonly coiinPrice: string;
    @Property() public readonly poNumber: string;
    @Property() public readonly productId: string;
    @Property() public readonly quantity: number;
    @Property() public readonly denomination: number;
}
export class XoxodayVoucherResultModel {
    @Property() public readonly productId: string;
    @Property() public readonly name: string;
    @Property() public readonly imageUrl: string;
    @Property() public readonly countryName: string;
    @Property() public readonly countryCode: string;
    @Property() public readonly currencyCode: string;
    @Property() public readonly exchangeRate: string;
    @ArrayOf(String) public readonly valueDenominations: Array<string>;
}
export class SocialPostResultModel {
    @Property() public readonly id: string;
    @Property() public readonly userId: string;
}
export class UserResultModel {
    @Property() public readonly id: string;
    @Property() public readonly email: string;
    @Property(String) public readonly username: string;
    @Property() public readonly createdAt: Date;
    @Property() public readonly lastLogin: Date | null;
    @Property() public readonly active: boolean;
    @Nullable(KycLevel) public readonly kycLevel1: KycLevel | null;
    @Nullable(KycLevel) public readonly kycLevel2: KycLevel | null;
    @Nullable(String) public readonly identityId: string | null;
    @Nullable(String) public readonly kycStatus: string | null;
    @Nullable(String) public readonly referralCode: string | null;
    @Nullable(String) public readonly promoCode: string | null;
    @Nullable(ProfileResultModel) public readonly profile: ProfileResultModel | null;
    @CollectionOf(SocialLinkResultModel) public readonly social_link: Partial<SocialLinkResultModel>[];
    @CollectionOf(ParticipantResultModel) public readonly participant: ParticipantResultModel[];
    @Nullable(WalletResultModel) public readonly wallet: Partial<WalletResultModel> | null;

    public static build(
        user: Prisma.User & {
            profile: Prisma.Profile | null;
            social_link?: Prisma.SocialLink[];
            participant?: (Prisma.Participant & { campaign: Prisma.Campaign })[];
            wallet?: Prisma.Wallet | null;
        },
        kyc?: { level1: KycLevel; level2: KycLevel }
    ): UserResultModel {
        return {
            ...user,
            username: user.profile?.username || "",
            profile: user.profile ? ProfileResultModel.build(user.profile) : null,
            participant: user.participant
                ? user.participant.map((participant) => ParticipantResultModel.build(participant))
                : [],
            social_link: user.social_link ? user.social_link : [],
            wallet: user.wallet || null,
            kycLevel1: kyc?.level1 || null,
            kycLevel2: kyc?.level2 || null,
            referralCode: user.referralCode,
            promoCode: user.promoCode,
        };
    }
}

export class RedemptionRequirementsModel {
    @Property() public accountAgeReached: boolean;
    @Property() public accountAge: number;
    @Property() public accountAgeRequirement: number;
    @Property() public twitterLinked: boolean;
    @Property() public twitterfollowers: number;
    @Property() public twitterfollowersRequirement: number;
    @Property() public participation: boolean;
    @Property() public participationScore: number;
    @Property() public participationScoreRequirement: number;
    @Property() public orderLimitForTwentyFourHoursReached: boolean;
}

export class CampaignMetricsResultModel {
    @Property() public readonly clickCount: number;
    @Property() public readonly viewCount: number;
    @Property() public readonly submissionCount: number;
    @Property() public readonly participantCount: number;
    @Property() public readonly likeCount: number;
    @Property() public readonly commentCount: number;
    @Property() public readonly shareCount: number;
    @Property() public readonly postCount: number;
    @Property() public readonly discoveryCount: number;
    @Property() public readonly conversionCount: number;
}

export class ParticipantMetricsResultModel {
    @Property() public readonly id: string;
    @Property() public readonly clickCount: string;
    @Property() public readonly viewCount: string;
    @Property() public readonly submissionCount: string;
    @Property() public readonly likeCount: string;
    @Property() public readonly shareCount: string;
    @Property() public readonly commentCount: string;
    @Property() public readonly participationScore: string;
    @Property() public readonly totalParticipationScore: string;
    @Property() public readonly participantId: string;
    @Property() public readonly userId: string;
    @Property() public readonly campaignId: string;
    @Property() public readonly createdAt: Date;
    @Property() public readonly updatedAt: Date;
    @Property() public readonly currentTotal: number;
    @Property() public readonly participantShare: number;
    @Property() public readonly participantShareUSD: number;
    @Property() public readonly symbol: string;
    @Property() public readonly symbolImageUrl: string;
    @Property() public readonly totalShareUSD: number;
    @Property() public readonly totalScore: number;
    @Property() public readonly link: string;
    @Property() public readonly email: string;
}

export class AccumulatedParticipantMetricsResultModel {
    @Property() public readonly campaignId: string;
    @Property() public readonly clickCount: number;
    @Property() public readonly viewCount: number;
    @Property() public readonly submissionCount: number;
    @Property() public readonly likeCount: number;
    @Property() public readonly shareCount: number;
    @Property() public readonly commentCount: number;
    @Property() public readonly participationScore: number;
    @Property() public readonly participantId: string;
    @Property() public readonly symbol: string;
    @Property() public readonly symbolImageUrl: string;
    @Property() public readonly currentTotal: number;
    @Property() public readonly participantShare: number;
    @Property() public readonly participantShareUSD: number;
}

export class AccumulatedUserMetricsResultModel {
    @Property() public readonly clickCount: number;
    @Property() public readonly viewCount: number;
    @Property() public readonly submissionCount: number;
    @Property() public readonly likeCount: number;
    @Property() public readonly shareCount: number;
    @Property() public readonly commentCount: number;
    @Property() public readonly totalScore: number;
    @Property() public readonly totalShareUSD: number;
}

export class SocialMetricsResultModel {
    @Property() public readonly totalLikes: number;
    @Property() public readonly totalShares: number;
    @Property() public readonly likesScore: number;
    @Property() public readonly shareScore: number;
}
export class UserDailyParticipantMetricResultModel {
    @Property() public readonly id: string;
    @Property() public readonly clickCount: string;
    @Property() public readonly viewCount: string;
    @Property() public readonly submissionCount: string;
    @Property() public readonly likeCount: string;
    @Property() public readonly shareCount: string;
    @Property() public readonly commentCount: string;
    @Property() public readonly participationScore: string;
    @Property() public readonly totalParticipationScore: string;
    @Property() public readonly participantId: string;
    @Property() public readonly createdAt: Date;
    @Property() public readonly updatedAt: Date;
    @Nullable(String) public readonly userId: string | null;
    @Nullable(String) public readonly campaignId: string | null;
}
export class ParticipantPostsModel {
    @Property() public readonly results: string;
}
export class MediaUrlsModel {
    @Property() public readonly name: string;
    @Nullable(String) public readonly channel: string | null;
    @Property() public readonly signedUrl: string;
}
export class CreateCampaignResultModel {
    @Property() public readonly campaignId: string;
    @Property() public readonly campaignImageSignedURL: string;
    @Property() public readonly raffleImageSignedURL: string;
    @CollectionOf(MediaUrlsModel) public readonly mediaUrls: MediaUrlsModel[];
}
export class UpdateCampaignResultModel {
    @Property() public readonly campaignId: string;
    @Property() public readonly campaignImageSignedURL: string;
    @Property() public readonly raffleImageSignedURL: string;
    @CollectionOf(MediaUrlsModel) public readonly mediaUrls: MediaUrlsModel[];
}

export class DeleteCampaignResultModel {
    @Property() public readonly campaignId: string;
    @Property() public readonly name: string;
}
export class UserWalletResultModel {
    @Property() public readonly symbol: string;
    @Property() public readonly balance: string;
    @Property() public readonly minWithdrawAmount: number;
    @Property() public readonly usdBalance: number;
    @Property() public readonly imageUrl: string;
    @Property() public readonly network: string;
}

export class UserRecordResultModel extends UserResultModel {
    @CollectionOf(SocialPostResultModel) public readonly social_post: SocialPostResultModel[];
}

export class BalanceResultModel {
    @Property() public readonly balance: string;
    @Property() public readonly symbol: string;
    @Property() public readonly minWithdrawAmount: number;
    @Property() public readonly usdBalance: number;
    @Property() public readonly imageUrl: string;
    @Property() public readonly network: string;
}

export class UpdatedResultModel {
    @Property() public readonly message: string;
}
export class CampaignIdModel {
    @Required() public readonly campaignId: string;
}
export class ParticipantQueryParams {
    @Required() public readonly id: string;
}

export class FlaggedParticipantResultModel {
    @Property() public readonly participantId: string;
    @Property() public readonly viewPayout: number;
    @Property() public readonly clickPayout: number;
    @Property() public readonly submissionPayout: number;
    @Property() public readonly likesPayout: number;
    @Property() public readonly sharesPayout: number;
    @Property() public readonly totalPayout: number;
}
export class GenerateCampaignAuditReportResultModel {
    @Property() public readonly totalClicks: number;
    @Property() public readonly totalViews: number;
    @Property() public readonly totalSubmissions: number;
    @Property() public readonly totalLikes: number;
    @Property() public readonly totalShares: number;
    @Property() public readonly totalParticipationScore: number;
    @Property() public readonly totalRewardPayout: number;
    @CollectionOf(FlaggedParticipantResultModel) public readonly flaggedParticipants: FlaggedParticipantResultModel[];
}

export class AcuantApplicationExtractedDetailsModel {
    @Property() public readonly age: number | null;
    @Property() public readonly fullName: string | null;
    @Property() public readonly address: string | null;
    @Property() public readonly isDocumentValid: boolean | null;
    @Property() public readonly documentDetails: string | null;
    @Property() public readonly documentExpiry: Date | null;
    @Property() public readonly email: string | null;
}

export class KycResultModel {
    @Property() public readonly kycId: string;
    @Property() public readonly status: KycStatus;
    // @Property() public readonly factors: AcuantApplicationExtractedDetailsModel;
}

export class BooleanResultModel {
    @Property() public readonly success: boolean;
}

export class SingleUserResultModel {
    @Property() public readonly active: boolean;
    @Property() public readonly createdAt: Date;
    @Property() public readonly updatedAt: Date;
    @Nullable(Date) public readonly deletedAt: Date | null;
    @Nullable(String) public readonly identityId: string | null;
    @Nullable(String) public readonly referralCode: string | null;
    @Property() public readonly id: string;
    @Nullable(String) public readonly kycStatus: string | null;
    @Nullable(Date) public readonly lastLogin: Date | null;
    @Property() public readonly email: string;
    @Property(ProfileResultModel) public readonly profile: ProfileResultModel;
    @Nullable(SocialPostResultModel) public readonly social_post: Prisma.SocialPost[];
}

export class UserTransactionResultModel extends TransferResultModel {
    @Property() public readonly transactionHash: string;
    @Property() public readonly orgId: string;
    @Property() public readonly stripeCardId: string;
    @Nullable(String) public readonly type: string;
}

export class AggregaredMetrics {
    @Property() public readonly clickCount: number;
    @Property() public readonly viewCount: number;
    @Property() public readonly shareCount: number;
    @Property() public readonly participationScore: number;
    @Property() public readonly totalParticipants: number;
    @Property() public readonly campaignName: string;
}
export class DashboardStatsResultModel {
    @Property() public readonly totalUsers: number;
    @Property() public readonly lastWeekUsers: number;
    @Property() public readonly bannedUsers: number;
    @Property() public readonly distributedTotalAmount: number;
    @Property() public readonly redeemedTotalAmount: number;
}

export class CampaignStatsResultModel {
    @Property() public readonly clickCount: number;
    @Property() public readonly viewCount: number;
    @Property() public readonly shareCount: number;
    @Property() public readonly participationScore: number;
}

export class CampaignStatsResultModelArray {
    @Property() public readonly aggregatedMetrics: AggregaredMetrics;
    @Property() public readonly rawMetrics: CampaignStatsResultModel[];
}

export class OrgEmployeesResultModel {
    @Property() public readonly adminsDetails: Prisma.Admin[];
    @Property() public readonly orgName: string;
}

export class OrgDetailsModel {
    @Property() public readonly name: string;
    @Property() public readonly createdAt: Date;
    @Property() public readonly adminCount: number;
    @Property() public readonly campaignCount: number;
}

export class LoginParams {
    @Required() public readonly email: string;
    @Required() public readonly password: string;
}

export class UserTokenReturnModel {
    @Property() public readonly token: string;
}

export class RegisterUserParams {
    @Required() public readonly email: string;
    @Required() public readonly username: string;
    @Required() public readonly password: string;
    @Required() public readonly verificationToken: string;
    @Nullable(String) public readonly referralCode: string | null;
}

export class ResetUserPasswordParams {
    @Required() public readonly verificationToken: string;
    @Required() public readonly password: string;
}

export class RecoverUserAccountStep1Parms {
    @Required() public readonly username: string;
    @Required() public readonly code: string;
}
export class RecoverUserAccountStep2Parms {
    @Required() public readonly email: string;
    @Required() public readonly password: string;
    @Required() public readonly userId: string;
    @Required() public readonly verificationToken: string;
}

export class CompleteVerificationParams {
    @Required() public readonly email: string;
    @Required() public readonly code: string;
}

export class CompleteVerificationResultModel extends BooleanResultModel {
    @Property() public readonly verificationToken: string;
}

export class UserParticipateParams {
    @Required() public readonly campaignId: string;
    @Property() public readonly email: string;
}

export class WeeklyRewardsResultModel {
    @Property() public readonly loginRewardRedeemed: boolean;
    @Property() public readonly loginReward: number;
    @Property() public readonly nextLoginReward: string;
    @Property() public readonly participationReward: number;
    @Property() public readonly participationId: string;
    @Property() public readonly nextParticipationReward: string;
    @Property() public readonly participationRewardRedeemed: boolean;
    @Property() public readonly participationRedemptionDate: string;
    @Property() public readonly loginRedemptionDate: string;
    @Property() public readonly earnedToday: number;
    @Property() public readonly sharingReward: number;
    @Property() public readonly sharingRewardType: SharingRewardType;
}
export class UpdateProfileInterestsParams {
    @Property() public readonly ageRange: string;
    @Property() public readonly city: string;
    @Property() public readonly state: string;
    @Property() public readonly country: string;
    @ArrayOf(String) public readonly interests: string[];
    @ArrayOf(String) public readonly values: string[];
}

export class RemoveInterestsParams {
    @Property() public readonly ageRange: string;
    @Property() public readonly city: string;
    @Property() public readonly state: string;
    @Property() public readonly country: string;
    @Property() public readonly interests: string;
    @Property() public readonly values: string;
}

export class UpdateNotificationSettingsParams {
    @Property() public readonly kyc: boolean;
    @Property() public readonly withdraw: boolean;
    @Property() public readonly campaignCreate: boolean;
    @Property() public readonly campaignUpdates: boolean;
}

export class ReturnSuccessResultModel {
    @Property() public readonly success: boolean;
    @Property() public readonly message: string;
}

export class CryptoCurrencyResultModel {
    @Property() public readonly id: string;
    @Property() public readonly type: string;
    @Nullable(String) public readonly contractAddress: string | null;
    @Property() public readonly createdAt: Date;
    @Property() public readonly updatedAt: Date;
}

export class SupportedCurrenciesResultModel {
    @Property() public readonly symbol: string;
    @Property() public readonly network: string;
}

export class DepositAddressResultModel {
    @Property() public readonly symbol: string;
    @Property() public readonly address: string;
    @Property() public readonly fromTatum: boolean;
    @Nullable(String) public readonly destinationTag: number | null;
    @Nullable(String) public readonly memo: string | null;
    @Nullable(String) public readonly message: string | null;
}

export class WithdrawResultModel {
    @Property() public readonly symbol: string;
    @Property() public readonly network: string;
    @Property() public readonly address: string;
    @Property() public readonly amount: number;
    @Property() public readonly message: string;
}

export class PaymentMethodsResultModel {
    @Property() public readonly id: string;
    @Nullable(String) public readonly last4: string | null | undefined;
    @Nullable(String) public readonly brand: string | null | undefined;
}

export class AllCurrenciesResultModel {
    @Property() public readonly balance: string;
    @Property() public readonly type: string;
    @Property() public readonly symbolImageUrl: string;
    @Property() public readonly network: string;
}
export class CampaignParticipantResultModel {
    @Property() public readonly id: string;
    @Property() public readonly campaignId: string;
    @Property() public readonly participationScore: string;
    @Property() public readonly clickCount: string;
    @Property() public readonly viewCount: string;
    @Property() public readonly submissionCount: string;
    @Nullable(String) public readonly link: string | null;
    @Property(Date) public readonly createdAt: Date;
    @Property(Date) public readonly updatedAt: Date;
    @Property() public readonly blacklist: boolean;
    @Property(CampaignResultModel) public readonly campaign: CampaignResultModel;
    @Property(UserResultModel) public readonly user: UserResultModel;
}

export class ParticipantResultModelV2 {
    @Property() public readonly id: string;
    @Property() public readonly campaignId: string;
    @Property() public readonly participationScore: string;
    @Nullable(String) public readonly link: string | null;

    @Property() public readonly currentlyParticipating: boolean;
    @Property(CampaignResultModel) public readonly campaign: CampaignResultModel;
    @Property(UserResultModel) public readonly user: UserResultModel;

    public static build(
        participant: Prisma.Participant & {
            campaign: Prisma.Campaign;
            user: Prisma.User & { profile?: Prisma.Profile | null };
        }
    ): ParticipantResultModel {
        const now = new Date();
        const currentlyParticipating =
            new Date(participant.campaign.beginDate).getTime() <= now.getTime() &&
            new Date(participant.campaign.endDate).getTime() >= now.getTime();

        return { ...participant, currentlyParticipating };
    }
}

export class UpdateNotificationSettingsResultModel {
    @Property(UserResultModel) public readonly user: UserResultModel;
    @Property(NotificationSettingsResultModel) public readonly notificationSettings: NotificationSettingsResultModel;
}

export class ParticipateToCampaignModel {
    @Property() public readonly id: string;
    @Property() public readonly clickCount: string;
    @Property() public readonly campaignId: string;
    @Property() public readonly viewCount: string;
    @Property() public readonly submissionCount: string;
    @Property() public readonly participationScore: string;
    @Nullable(String) public readonly link: string | null;
    @Property(Date) public readonly createdAt: Date;
    @Property(Date) public readonly updatedAt: Date;
    @Property() public readonly userId: string;
    @Nullable(String) public readonly email: string | null;
    @Property() public readonly campaign: Prisma.Campaign;
    @Property(UserResultModel) public readonly user: UserResultModel;

    public static build(
        participant: Prisma.Participant & {
            campaign: Prisma.Campaign & { org: Prisma.Org | null } & {
                currency: (Prisma.Currency & { token: Prisma.Token | null }) | null;
            };
            user: Prisma.User & { wallet: Prisma.Wallet | null } & { profile: Prisma.Profile | null };
        }
    ): ParticipateToCampaignModel {
        return { ...participant, user: UserResultModel.build(participant.user) };
    }
}

class CampaignParticipantsResultModel {
    @Property() public readonly id: string;
    @Property() public readonly userId: string;
    @Property() public readonly username: string;
    @Property() public readonly email: string;
    @Property() public readonly createdAt: Date;
    @Property() public readonly lastLogin: Date | null;
    @Property() public readonly campaignName: string;
    @Property() public readonly twitterUsername: string;
    @Property() public readonly selfPostCount: number;
    @Property() public readonly likeScore: number;
    @Property() public readonly shareScore: number;
    @Property() public readonly totalLikes: number;
    @Property() public readonly totalShares: number;
    @Property() public readonly participationScore: number;
    @Property() public readonly blacklist: boolean;
}

export class CampaignDetailsResultModel {
    @Property() public readonly participants: CampaignParticipantsResultModel[];
    @Property() public readonly count: number;
}

export class PaidOutCryptoResultModel {
    @Property() public readonly totalCrypto: string;
}

export class UserStatisticsResultModel {
    @Property() public readonly clickCount: number;
    @Property() public readonly viewCount: number;
    @Property() public readonly likeCount: number;
    @Property() public readonly shareCount: number;
    @Property() public readonly submissionCount: number;
    @Property() public readonly commentCount: number;
    @Property() public readonly participationScore: number;
    @Property() public readonly campaignName: string;
    @Property() public readonly participationDate: Date;
}

export class CreateCampaignParams {
    @Required() public readonly name: string;
    @Required() public readonly coiinTotal: string;
    @Required() public readonly target: string;
    @Property() public readonly targetVideo: string;
    @Required() public readonly beginDate: Date;
    @Required() public readonly endDate: Date;
    @Property() public readonly description: string;
    @Property() public readonly instructions: string;
    @Required() public readonly symbol: string;
    @Required() public readonly network: string;
    @Property() public readonly company: string;
    @Required() public readonly algorithm: string;
    @Property() public readonly requirements: JSON;
    @Required() public readonly imagePath: string;
    @Property() public readonly campaignType: string;
    @Property() public readonly socialMediaType: string[];
    @Property() public readonly tagline: string;
    @Property() public readonly suggestedPosts: string[];
    @Property() public readonly suggestedTags: string[];
    @Property() public readonly keywords: string[];
    @Property() public readonly type: string;
    @Property() public readonly raffle_prize: RafflePrize;
    @Property() public readonly campaignMedia: CampaignMedia[];
    @Property() public readonly campaignTemplates: CampaignTemplate[];
    @Property() public readonly isGlobal: boolean;
    @Required() public readonly showUrl: boolean;
}

export class UpdateCampaignParams {
    @Property() public readonly id: string;
    @Required() public readonly name: string;
    @Required() public readonly coiinTotal: string;
    @Required() public readonly target: string;
    @Property() public readonly targetVideo: string;
    @Required() public readonly beginDate: Date;
    @Required() public readonly endDate: Date;
    @Property() public readonly description: string;
    @Property() public readonly instructions: string;
    @Property() public readonly isGlobal: boolean;
    @Required() public readonly showUrl: boolean;
    @Property() public readonly company: string;
    @Required() public readonly algorithm: string;
    @Property() public readonly requirements: JSON;
    @Property() public readonly imagePath: string;
    @Property() public readonly campaignType: string;
    @Property() public readonly socialMediaType: string[];
    @Property() public readonly tagline: string;
    @Property() public readonly suggestedPosts: string[];
    @Property() public readonly suggestedTags: string[];
    @Property() public readonly keywords: string[];
    @Property() public readonly type: string;
    @Property() public readonly raffle_prize: RafflePrize;
    @Property() public readonly campaignMedia: CampaignMedia[];
    @Property() public readonly campaignTemplates: CampaignTemplate[];
}

export class VerifySessionResultModel {
    @Property() public readonly role: string;
    @Property() public readonly company: string;
    @Property() public readonly email: string;
    @Nullable(Boolean) public readonly tempPass: boolean | null;
}

export class TransactionResultModel {
    @Property() public readonly id: string;
    @Property() public readonly txId: string;
    @Property() public readonly chain: string;
    @Nullable(String) public readonly action: string | null;
    @Nullable(String) public readonly socialType: string | null;
    // @Property() public readonly tag: string;
    // @Nullable(String) public readonly campaignId: string | null;
    // @Nullable(String) public readonly participantId: string | null;
    // @Property() public readonly transactionType: string;
    // @Property() public readonly createdAt: Date;
    // @Property() public readonly updatedAt: Date;

    public static build(transaction: Prisma.Transaction): TransactionResultModel {
        return {
            ...transaction,
            chain: transaction.chain,
            action: transaction.action,
        };
    }
}

export class SocialPostCountResultModel {
    @Property() public readonly count: number;
}

export class EngagementRateResultModel {
    @Property() public readonly likeRate: string;
    @Property() public readonly commentRate: string;
    @Property() public readonly shareRate: string;
    @Property() public readonly viewRate: string;
    @Property() public readonly submissionRate: string;
    @Property() public readonly clickRate: string;
}
export class CampaignScoreResultModel {
    @Property() public readonly averageClicks: string;
    @Property() public readonly engagementRates: EngagementRateResultModel;
    @Property() public readonly likeStandardDeviation: string;
    @Property() public readonly commentStandardDeviation: string;
    @Property() public readonly sharesStandardDeviation: string;
    @Property() public readonly clicksStandardDeviation: string;
    @Property() public readonly viewsStandardDeviation: string;
    @Property() public readonly submissionsStandardDeviation: string;
}
