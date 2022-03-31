import express, { Request } from "express";
import { BigNumber } from "bignumber.js";
import { Stripe } from "stripe";
import { CampaignState, CampaignStatus } from "./util/constants";

interface JWTPayload {
    email: string;
    userId: string;
    id: string;
    role: string;
    company?: string;
}

export interface SymbolNetworkParams {
    symbol: string;
    network: string;
}

export type CustodialAddressChain = "ETH" | "MATIC" | "BSC" | "ONE" | "XDC";
export type RewardType = "LOGIN_REWARD" | "PARTICIPATION_REWARD" | "REGISTRATION_REWARD" | "SHARING_REWARD";

export interface NewCampaignVariables {
    id?: string;
    name: string;
    targetVideo?: string;
    beginDate: string;
    endDate: string;
    coiinTotal: number;
    target: string;
    description: string;
    instructions: string;
    company: string;
    algorithm: string;
    imagePath: string;
    tagline: string;
    requirements: CampaignRequirementSpecs;
    suggestedPosts: string[];
    suggestedTags: string[];
    keywords: string[];
    type: string;
    rafflePrize: RafflePrizeStructure;
    symbol: string;
    network: string;
    campaignType: string;
    socialMediaType: string[];
    campaignMedia: CampaignChannelMedia[];
    campaignTemplates: CampaignChannelTemplate[];
    isGlobal: boolean;
    showUrl: boolean;
}

export interface ListCampaignsVariables {
    open: boolean;
    skip: number;
    take: number;
    scoped: boolean;
    sort: boolean;
    approved: boolean;
    pendingAudit: boolean;
}

export interface XoxodayVoucher {
    productId: string;
    name: string;
    imageUrl: string;
    countryName: string;
    countryCode: string;
    currencyCode: string;
    exchangeRate: string;
    valueDenominations: Array<string>;
}

export interface XoxodayOrder {
    poNumber: string;
    productId: string;
    quantity: number;
    denomination: number;
    email: string;
    tag: string;
    contact: string;
    notifyAdminEmail?: number;
    notifyReceiverEmail?: number;
}

export interface SupportedCountryType {
    name: string;
    currency: string;
    enabled: boolean;
    filterValue: string;
}

export interface FactorGeneration {
    name: string;
    id: string;
}

export interface RafflePrizeStructure {
    displayName: string;
    affiliateLink?: string;
    image?: string;
}

export interface KycUser {
    firstName: string;
    lastName: string;
    businessName: string;
    address: {
        country: string;
        address1: string;
        address2?: string;
        city: string;
        state: string;
        zip: string;
    };
    phoneNumber: string;
    email: string;
    paypalEmail: string;
    idProof: string | undefined;
    addressProof: string | undefined;
    exceptions: string;
    typeOfStructure: string;
    accountNumbers: string;
    ssn: string;
    hasIdProof: boolean;
    hasAddressProof: boolean;
}

export interface AuthRequest extends express.Request {
    user: any;
}

export interface AggregateDailyMetrics {
    clickCount: number;
    submissionCount: number;
    viewCount: number;
    likeCount: number;
    shareCount: number;
    commentCount: number;
}

export interface Tiers {
    [index: string]: { threshold: BigNumber; totalCoiins: BigNumber };
}
export interface AlgorithmSpecs {
    version: number;
    initialTotal: BigNumber;
    pointValues: ActionValues;
    tiers: Tiers;
}

export interface CampaignChannelTemplate {
    id?: string;
    channel: string;
    post: string;
}

export interface CampaignChannelMedia {
    id?: string;
    channel: string;
    media: string;
    mediaFormat: string;
    isDefault: boolean;
}

export interface CampaignRequirementSpecs {
    version: number;
    city: string;
    state: string;
    country: string;
    values: string[];
    interests: string[];
    ageRange: AgeRangeRequirementSpecs;
    socialFollowing: SocialFollowingSpecs;
}

export interface SocialFollowingSpecs {
    twitter: TwitterSocialFollowingSpecs;
}
export interface TwitterSocialFollowingSpecs {
    minFollower: number;
}

export interface AgeRangeRequirementSpecs {
    version: number;
    "0-17": Boolean;
    "18-25": Boolean;
    "26-40": Boolean;
    "41-55": Boolean;
    "55+": Boolean;
}

export type DateTrunc = "hour" | "day" | "week" | "month" | "quarter" | "year" | "all";

export interface HourlyMetricsGroupedByDateQueryResult {
    [key: string]: string | Date;
    interval: Date;
    postCount: string;
    participantCount: string;
    clickCount: string;
    viewCount: string;
    submissionCount: string;
    likeCount: string;
    shareCount: string;
    commentCount: string;
}

export interface CampaignMetricsGroupedByDateParsed {
    interval: string;
    postCount: number;
    participantCount: number;
    clickCount: number;
    viewCount: number;
    submissionCount: number;
    likeCount: number;
    shareCount: number;
    commentCount: number;
    totalDiscoveries: number;
    totalConversions: number;
    averagePostCost: number;
    averageDiscoveryCost: number;
    averageConversionCost: number;
}

export interface PlatformMetricsGroupedByDateParsed {
    interval: string;
    postCount: number;
    participantCount: number;
    clickCount: number;
    viewCount: number;
    submissionCount: number;
    likeCount: number;
    shareCount: number;
    commentCount: number;
    totalDiscoveries: number;
    totalConversions: number;
}

export interface CampaignAuditReport {
    totalClicks: BigNumber;
    totalViews: BigNumber;
    totalSubmissions: BigNumber;
    totalLikes: BigNumber;
    totalShares: BigNumber;
    totalParticipationScore: BigNumber;
    totalRewardPayout: BigNumber;
    flaggedParticipants: {
        participantId: string;
        viewPayout: BigNumber;
        clickPayout: BigNumber;
        submissionPayout: BigNumber;
        likesPayout: BigNumber;
        sharesPayout: BigNumber;
        totalPayout: BigNumber;
    }[];
}

export interface ActionValues {
    [key: string]: BigNumber;
    clicks: BigNumber;
    views: BigNumber;
    submissions: BigNumber;
    likes: BigNumber;
    shares: BigNumber;
}

export interface TwitterLinkCredentials {
    apiKey: string;
    apiSecret: string;
}

export interface TiktokLinkCredentials {
    open_id: string;
    access_token: string;
    expires_in: BigNumber;
    refresh_token: string;
    refresh_expires_in: BigNumber;
}

export type SocialType = "twitter" | "facebook" | "tiktok";

export interface PaypalPayout {
    recipient_type: "EMAIL";
    amount: {
        value: string;
        currency: "USD";
    };
    note: "Thanks for making it Raiin!";
    sender_item_id: string;
    receiver: string;
}

export type TransferStatus =
    | "BLOCKED"
    | "CANCELED"
    | "DENIED"
    | "FAILED"
    | "HELD"
    | "REFUNDED"
    | "RETURNED"
    | "SUCCEEDED"
    | "UNCLAIMED"
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

export type TransferAction =
    | "TRANSFER"
    | "WITHDRAW"
    | "DEPOSIT"
    | "FEE"
    | "PRIZE"
    | "REFUND"
    | "LOGIN_REWARD"
    | "REGISTRATION_REWARD"
    | "PARTICIPATION_REWARD"
    | "SHARING_REWARD"
    | "CAMPAIGN_REWARD"
    | "NETWORK_REWARD"
    | "XOXODAY_REDEMPTION";

export type CampaignAuditStatus = "DEFAULT" | "AUDITED" | "PENDING";
export type KycStatus = "APPROVED" | "PENDING" | "REJECTED" | "";
export type VerificationType = "EMAIL" | "PASSWORD" | "WITHDRAW" | "";

export interface ListCampaignsVariablesV2 {
    skip: number;
    take: number;
    state: CampaignState;
    status?: CampaignStatus | "ALL";
    userRelated?: boolean;
}
export interface FindParticipantById {
    id: string;
    userRelated?: boolean;
}
export interface FindCampaignById {
    campaignId: string;
    userRelated?: boolean;
    skip?: number;
    take?: number;
}
export interface SocialLinkVariables {
    id: string;
    type: string;
    apiKey: string;
    apiSecret: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    followerCount: number;
    accessToken: string | null;
    refreshToken: string | null;
    openId: string | null;
    accessTokenExpiry: string | null;
    refreshTokenExpiry: string | null;
}
export interface AlgorithmJsonValueType {
    tiers: { [key: string]: { threshold: string; totalCoiins: string } };
    pointValues: JSON;
}

export interface GetCampaignsParticipantsVariables {
    campaignId?: string;
    skip: number;
    take: number;
}

export interface GraphApiInputParameters {
    fields?: string[] | string;
    metric?: string[] | string;
    period?: string;
    since?: number;
    until?: number;
    grant_type?: string;
    client_secret?: string;
    access_token?: string;
}

export interface FacebookAuth {
    accessToken: string;
}

export interface ParticipantEngagement {
    participantId: string;
    shareRate: BigNumber;
    likeRate: BigNumber;
    commentRate: BigNumber;
    viewRate: BigNumber;
    submissionRate: BigNumber;
    clickRate: BigNumber;
}

export interface PaymentIntent extends Stripe.PaymentIntent {
    metadata: {
        transferId: string;
        stage: string;
    };
}

export interface KycApplication {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    billingStreetAddress?: string;
    billingCity?: string;
    billingCountry?: string;
    billingZip?: number;
    zipCode?: string;
    gender?: string;
    dob?: string;
    phoneNumber?: string;
    documentType?: string;
    documentCountry?: string;
    frontDocumentImage?: string;
    faceImage?: string;
    backDocumentImage?: string;
}

export interface KycResult {
    id: string;
    state: string;
    factors: Factor[];
    error?: string;
}

export interface Factor {
    id: string;
    name: string;
    hashType: string; //'sha256';
    providerId: string;
    signature: string;
    factor: string;
}

interface AcuantApplicationExtractedDetails {
    age: number | null;
    fullName: string | null;
    address: string | null;
    isDocumentValid: boolean | null;
    documentDetails: string | null;
    documentExpiry: Date | null;
}
