import { ArrayOf, CollectionOf, Nullable, Optional, Property } from "@tsed/schema";

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
    @Nullable(String) public readonly status: string | null;
    @Nullable(String) public readonly usdAmount: string | null;
    @Nullable(String) public readonly ethAddress: string | null;
    @Nullable(String) public readonly paypalAddress: string | null;
    @Nullable(String) public readonly currency: string | null;
    @Nullable(String) public readonly network: string | null;
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
    @ArrayOf(String) public readonly valueDenominations: Array<string>;
}
export class UserResultModel {
    @Property() public readonly id: string;
    @Property() public readonly email: string;
    @Property() public readonly createdAt: Date;
    @Nullable(String) public readonly identityId: string | null;
    @Nullable(String) public readonly kycStatus: string | null;
    @Nullable(ProfileResultModel) public readonly profile: ProfileResultModel | null;
    @CollectionOf(SocialLinkResultModel) public readonly social_link: Partial<SocialLinkResultModel>[];
    @CollectionOf(ParticipantResultModel) public readonly participant: Partial<ParticipantResultModel>[];
    @Nullable(WalletResultModel) public readonly wallet: Partial<WalletResultModel> | null;
}

export class RedemptionRequirementsModel {
    @Property() public readonly twitterLinked: boolean;
    @Property() public readonly twitterfollowers: number;
    @Property() public readonly twitterfollowersRequirement: number;
    @Property() public readonly participation: boolean;
    @Property() public readonly orderLimitForTwentyFourHoursReached: boolean;
}

export class UserWalletResultModel {
    @Property() public readonly symbol: string;
    @Property() public readonly balance: string;
    @Property() public readonly minWithdrawAmount: number;
    @Property() public readonly usdBalance: number;
    @Property() public readonly imageUrl: string;
    @Property() public readonly network: string;
}
