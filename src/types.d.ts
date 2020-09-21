import {Request} from 'express';
import { BigNumber } from 'bignumber.js';

export interface FactorGeneration {
  FactorName: string;
  FactorId: string;
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
    2: {
        threshold: BigNumber;
        totalCoiins: BigNumber;
    },
    3: {
        threshold: BigNumber;
        totalCoiins: BigNumber;
    },
    4: {
        threshold: BigNumber;
        totalCoiins: BigNumber;
    },
    5: {
        threshold: BigNumber;
        totalCoiins: BigNumber;
    },
}
export interface AlgorithmSpecs {
    version: number;
    initialTotal: BigNumber;
    pointValues: ActionValues;
    tiers: Tiers
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
