import {Request} from 'express';
import { BigNumber } from 'bignumber.js';
import {Participant} from "./models/Participant";

export interface FactorGeneration {
  name: string;
  id: string;
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
  idProof: string|undefined;
  addressProof: string|undefined;
  exceptions: string;
  typeOfStructure: string;
  accountNumbers: string;
  ssn: string;
  hasIdProof: boolean;
  hasAddressProof: boolean;
}

export interface AuthRequest extends Request {
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
    [index: string]: {threshold:BigNumber; totalCoiins: BigNumber;};
}
export interface AlgorithmSpecs {
    version: number;
    initialTotal: BigNumber;
    pointValues: ActionValues;
    tiers: Tiers
}

export interface CampaignRequirementSpecs {
    version: number;
    city: string,
    state: string,
    country: string,
    values: string[],
    interests: string[],
    ageRange: AgeRangeRequirementSpecs,
    socialFollowing: SocialFollowingSpecs,
}

export interface SocialFollowingSpecs {
    twitter: TwitterSocialFollowingSpecs,
}
export interface TwitterSocialFollowingSpecs {
    minFollower: number,
}

export interface AgeRangeRequirementSpecs {
  version: number;
  "0-17": Boolean
  "18-25": Boolean
  "26-40": Boolean,
  "41-55": Boolean,
  "55+": Boolean,
}

export type DateTrunc = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';

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
    totalClicks: BigNumber
    totalViews: BigNumber
    totalSubmissions: BigNumber
    totalLikes: BigNumber
    totalShares: BigNumber
    totalParticipationScore: BigNumber
    totalRewardPayout: BigNumber
    flaggedParticipants: {
        participantId: string
        viewPayout: BigNumber
        clickPayout: BigNumber
        submissionPayout: BigNumber
        likesPayout: BigNumber
        sharesPayout: BigNumber
        totalPayout: BigNumber
    }[]
}

export interface ActionValues {
    [key: string]: BigNumber;
    click: BigNumber;
    view: BigNumber;
    submission: BigNumber;
    likes: BigNumber;
    shares: BigNumber;
}

export interface SocialClientCredentials {
  apiKey?: string;
  apiSecret?: string;
}

export interface PaypalPayout {
    recipient_type: 'EMAIL',
    amount: {
        value: string;
        currency: 'USD'
    },
    note: "Thanks for making it Raiin!",
    sender_item_id: string;
    "receiver": string,
}

export type PayoutStatus = 'BLOCKED' | 'CANCELED' | 'DENIED' | 'FAILED' | 'HELD' | 'REFUNDED' | 'RETURNED' | 'SUCCEEDED' | 'UNCLAIMED'

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
