import {Request} from 'express';
import { BigNumber } from 'bignumber.js';

export interface AuthRequest extends Request {
    user: any;
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
