import { CollectionOf, Nullable, Property } from "@tsed/schema";

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

export class CampaignResultModel {
    @Property() public readonly id: string;
    @Property() public readonly name: string;
    @Property(Date) public readonly beginDate: Date;
    @Property(Date) public readonly endDate: Date;
    @Property() public readonly coiinTotal: string;
    @Property() public readonly status: string;
    @Property() public readonly symbol: string;
    @Property() public readonly isGlobal: boolean;
    @Property() public readonly showUrl: boolean;
    @Property() public readonly totalParticipationScore: string;
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
    @Property() public readonly socialMediaType: string;
    @Nullable(String) public readonly tagline: string | null;
    @Nullable(Object) public readonly requirements: any | null;
    @Property() public readonly suggestedPosts: string;
    @Property() public readonly keywords: string;
    @Property() public readonly suggestedTags: string;
    @Nullable(String) public readonly type: string | null;
    @CollectionOf(CampaignMediaResultModel) public readonly campaign_media: CampaignMediaResultModel[];
    @CollectionOf(CampaignTemplateResultModel) public readonly campaign_template: CampaignTemplateResultModel[];
}

export class CurrentCampaignModel {
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

export class ParticipantResultModel {
    @Property() public readonly id: string;
    @Property() public readonly campaignId: string;
    @Property() public readonly participationScore: string;
    @Nullable(String) public readonly link: string | null;
}

export class ProfileResultModel {
    @Property() public readonly username: string;
    @Nullable(String) public readonly email: string | null;
    @Nullable(String) public readonly ageRange: string | null;
    @Nullable(String) public readonly city: string | null;
    @Nullable(String) public readonly state: string | null;
    @Property() public readonly interests: string;
    @Property() public readonly values: string;
    @Nullable(String) public readonly country: string | null;
    @Nullable(String) public readonly profilePicture: string | null;

    @Property() public hasRecoveryCodeSet?: boolean;
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
    @Nullable(String) public readonly status: string | null;
    @Nullable(String) public readonly usdAmount: string | null;
    @Nullable(String) public readonly ethAddress: string | null;
    @Nullable(String) public readonly paypalAddress: string | null;
    @Nullable(String) public readonly currency: string | null;
    @Nullable(String) public readonly network: string | null;
    @Nullable(CampaignResultModel) public readonly campaign: CampaignResultModel | null;
    @Nullable(RafflePrizeResultModel) public readonly raffle_prize: RafflePrizeResultModel | null;
}

export class WalletResultModel {
    @Property() public readonly id: string;
    @CollectionOf(TransferResultModel) public readonly transfer: TransferResultModel[];
    @CollectionOf(WalletCurrencyResultModel) public readonly wallet_currency: WalletCurrencyResultModel[];
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
    @Property() public readonly valueDenominations: Array<string>;
}
export class UserResultModel {
    @Property() public readonly id: string;
    @Property() public readonly email: string;
    @Nullable(String) public readonly identityId: string | null;
    @Nullable(String) public readonly kycStatus: string | null;
    @Nullable(ProfileResultModel) public readonly profile: ProfileResultModel | null;
    @CollectionOf(SocialLinkResultModel) public readonly social_link: Partial<SocialLinkResultModel>[];
    @CollectionOf(ParticipantResultModel) public readonly participant: Partial<ParticipantResultModel>[];
    @Nullable(NotificationSettingsResultModel)
    public readonly notification_settings: Partial<NotificationSettingsResultModel> | null;
    @Nullable(WalletResultModel) public readonly wallet: Partial<WalletResultModel> | null;
    @CollectionOf(XoxodayOrderResultModel) public readonly xoxoday_order: Partial<XoxodayOrderResultModel>[];
}

export class RedemptionRequirementsModel {
    @Property() public readonly twitterLinked: boolean;
    @Property() public readonly twitterfollowers: number;
    @Property() public readonly twitterfollowersRequirement: number;
    @Property() public readonly participation: boolean;
    @Property() public readonly orderLimitForTwentyFourHoursReached: boolean;
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
}

export class ParticipantMetricsResultModel {
    @Property() public readonly id: string;
    @Property() public readonly clickCount: number;
    @Property() public readonly viewCount: number;
    @Property() public readonly submissionCount: number;
    @Property() public readonly likeCount: number;
    @Property() public readonly shareCount: number;
    @Property() public readonly commentCount: number;
    @Property() public readonly participationScore: number;
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
}

export class SocialMetricsResultModel {
    @Property() public readonly totalLikes: number;
    @Property() public readonly totalShares: number;
    @Property() public readonly likesScore: number;
    @Property() public readonly shareScore: number;
}
export class DailyParticipantMetricResultModel {
    @Property() public readonly id: string;
    @Property() public readonly clickCount: number;
    @Property() public readonly viewCount: number;
    @Property() public readonly submissionCount: number;
    @Property() public readonly likeCount: number;
    @Property() public readonly shareCount: number;
    @Property() public readonly commentCount: number;
    @Property() public readonly participationScore: number;
    @Property() public readonly totalParticipationScore: string;
    @Property() public readonly participantId: string;
    @Property() public readonly createdAt: Date;
    @Property() public readonly updatedAt: Date;
    @Nullable(String) public readonly userId: string | null;
    @Nullable(String) public readonly campaignId: string | null;
}
// export class ParticipantModel {
//     @Property() public readonly id: string;
//     @Property() public readonly clickCount: number;
//     @Property() public readonly campaignId: string;
//     @Property() public readonly viewCount: number;
//     @Property() public readonly submissionCount: number;
//     @Property() public readonly participationScore: string;
//     @Nullable(String) public readonly link: string | null;
//     @Property() public readonly createdAt: Date;
//     @Property() public readonly updatedAt: Date;
//     @Property() public readonly userId: string;
//     @Nullable(String) public readonly email: string | null;
//     @Nullable(CampaignResultModel) public readonly campaign: CampaignResultModel[] | null;
//     @Nullable(UserResultModel) public readonly user: UserResultModel[] | null;
// }
