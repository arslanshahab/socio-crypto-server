import {Request} from 'express';

export interface AuthRequest extends Request {
    user: any;
}

export interface Tiers {
    [index: string]: {threshold:number; totalCoiins: number;};
    2: {
        threshold: number;
        totalCoiins: number;
    },
    3: {
        threshold: number;
        totalCoiins: number;
    },
    4: {
        threshold: number;
        totalCoiins: number;
    },
    5: {
        threshold: number;
        totalCoiins: number;
    },
}
export interface AlgorithmSpecs {
    version: number;
    initialTotal: number;
    pointValues: ActionValues;
    tiers: Tiers
}

export interface CampaignAuditReport {
    totalClicks: number
    totalViews: number
    totalSubmissions: number
    totalLikes: number
    totalShares: number
    totalParticipationScore: number
    totalRewardPayout: number
    flaggedParticipants: {
        participantId: string
        viewPayout: number
        clickPayout: number
        submissionPayout: number
        likesPayout: number
        sharesPayout: number
        totalPayout: number
    }[]
}

export interface ActionValues {
    click: number;
    view: number;
    submission: number;
    likes: number;
    shares: number;
}

export interface SocialClientCredentials {
  apiKey?: string;
  apiSecret?: string;
}

export interface DragonfactorLoginRequest {
  service: string;
  factorType: string;
  timestamp: string;
  factor: string;
  signingPublicKey: string;
  factorAssociationPublicKey: string;
  signature: string;
}
