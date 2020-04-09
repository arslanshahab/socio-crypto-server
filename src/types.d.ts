import {Request} from 'express';

export interface AuthRequest extends Request {
    user: any;
}

export interface Tiers {
    [index: string]: {treshold:number; totalCoiins: number;};
    2: {
        treshold: number;
        totalCoiins: number;
    },
    3: {
        treshold: number;
        totalCoiins: number;
    },
    4: {
        treshold: number;
        totalCoiins: number;
    },
    5: {
        treshold: number;
        totalCoiins: number;
    },
}
export interface AlgorithmSpecs {
    version: number;
    initialTotal: number;
    pointValues: {
        click: number;
        view: number;
        submission: number;
    };
    tiers: Tiers
}

export interface CampaignAuditReport {
    totalClicks: number
    totalViews: number
    totalSubmissions: number
    totalParticipationScore: number
    totalRewardPayout: number
    flaggedParticipants: {
        participantId: string
        viewPayout: number
        clickPayout: number
        submissionPayout: number
        totalPayout: number
    }[]
}
