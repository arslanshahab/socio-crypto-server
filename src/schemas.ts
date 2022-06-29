import Ajv, { ValidateFunction } from "ajv";

export const algorithmCreateSchema = {
    type: "object",
    properties: {
        version: { type: "string" },
        pointValues: {
            type: "object",
            properties: {
                clicks: { type: "string" },
                views: { type: "string" },
                submissions: { type: "string" },
                likes: { type: "string" },
                comments: { type: "string" },
                shares: { type: "string" },
            },
        },
        tiers: {
            type: "object",
            properties: {
                "1": {
                    type: "object",
                    properties: {
                        threshold: { type: "string" },
                        totalCoiins: { type: "string" },
                    },
                },
                "2": {
                    type: "object",
                    properties: {
                        threshold: { type: "string" },
                        totalCoiins: { type: "string" },
                    },
                },
                "3": {
                    type: "object",
                    properties: {
                        threshold: { type: "string" },
                        totalCoiins: { type: "string" },
                    },
                },
                "4": {
                    type: "object",
                    properties: {
                        threshold: { type: "string" },
                        totalCoiins: { type: "string" },
                    },
                },
                "5": {
                    type: "object",
                    properties: {
                        threshold: { type: "string" },
                        totalCoiins: { type: "string" },
                    },
                },
                "6": {
                    type: "object",
                    properties: {
                        threshold: { type: "string" },
                        totalCoiins: { type: "string" },
                    },
                },
                "7": {
                    type: "object",
                    properties: {
                        threshold: { type: "string" },
                        totalCoiins: { type: "string" },
                    },
                },
                "8": {
                    type: "object",
                    properties: {
                        threshold: { type: "string" },
                        totalCoiins: { type: "string" },
                    },
                },
                "9": {
                    type: "object",
                    properties: {
                        threshold: { type: "string" },
                        totalCoiins: { type: "string" },
                    },
                },
                "10": {
                    type: "object",
                    properties: {
                        threshold: { type: "string" },
                        totalCoiins: { type: "string" },
                    },
                },
            },
        },
    },
};

export const campaignRequirementsSchema = {
    type: "object",
    properties: {
        version: { type: "string" },
        ageRange: {
            type: "object",
            properties: {
                "0-17": { type: "boolean" },
                "18-25": { type: "boolean" },
                "26-40": { type: "boolean" },
                "41-55": { type: "boolean" },
                "55+": { type: "boolean" },
            },
        },
        location: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    city: { type: "string" },
                    state: { type: "string" },
                    country: { type: "string" },
                },
            },
        },
        socialFollowing: {
            type: "object",
            properties: {
                twitter: {
                    type: "object",
                    properties: {
                        minFollower: {
                            type: "number",
                        },
                    },
                },
            },
        },
        values: {
            type: "array",
            items: { type: "string" },
        },
        interests: {
            type: "array",
            items: { type: "string" },
        },
    },
};

export const hourlyMetrics = {
    type: "object",
    properties: {
        campaignId: { type: "string" },
        filter: {
            type: "string",
            enum: ["hour", "day", "week", "month", "quarter", "year", "all"],
        },
    },
};

export const kycUserLevel1 = {
    type: "object",
    properties: {
        firstName: { type: "string" },
        middleName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string" },
        ip: { type: "string" },
        billingStreetAddress: { type: "string" },
        billingCity: { type: "string" },
        billingCountry: { type: "string" },
        zipCode: { type: "string" },
        gender: { type: "string" },
        dob: { type: "string" },
        phoneNumber: { type: "string" },
    },
    required: [
        "firstName",
        "lastName",
        "billingStreetAddress",
        "billingCity",
        "billingCountry",
        "gender",
        "dob",
        "phoneNumber",
        "ip",
        "zipCode",
        "email",
    ],
};

export const kycUserLevel2 = {
    type: "object",
    properties: {
        documentType: { type: "string" },
        documentCountry: { type: "string" },
        frontDocumentImage: { type: "string" },
        faceImage: { type: "string" },
        backDocumentImage: { type: "string" },
    },
    required: ["documentType", "documentCountry", "frontDocumentImage", "backDocumentImage", "faceImage"],
};

const rafflePrizeSchema = {
    type: "object",
    properties: {
        displayName: { type: "string" },
        affiliateLink: { type: "string" },
        image: { type: "string" },
    },
    required: ["displayName"],
};

export class Validator {
    private ajv: Ajv;
    private validateAlgorithmCreatePayload: ValidateFunction;
    private validateCampaignRequirementsPayload: ValidateFunction;
    private validateKycUser: ValidateFunction;
    private validateKycUserLevel1: ValidateFunction;
    private validateKycUserLevel2: ValidateFunction;
    private validateHourlyMetrics: ValidateFunction;
    private validateRafflePrizePayload: ValidateFunction;

    public constructor() {
        this.ajv = new Ajv();
        this.validateAlgorithmCreatePayload = this.ajv.compile(algorithmCreateSchema);
        this.validateCampaignRequirementsPayload = this.ajv.compile(campaignRequirementsSchema);
        this.validateKycUser = this.ajv.compile(kycUserLevel2);
        this.validateKycUserLevel1 = this.ajv.compile(kycUserLevel1);
        this.validateKycUserLevel2 = this.ajv.compile(kycUserLevel2);
        this.validateHourlyMetrics = this.ajv.compile(hourlyMetrics);
        this.validateRafflePrizePayload = this.ajv.compile(rafflePrizeSchema);
    }

    public validateRafflePrizeSchema = (payload: object) => {
        if (!this.validateRafflePrizePayload(payload)) {
            throw new Error(
                `Incoming raffle prize structure is invalid: ${JSON.stringify(this.validateRafflePrizePayload.errors)}`
            );
        }
    };

    public validateAlgorithmCreateSchema = (payload: object) => {
        if (!this.validateAlgorithmCreatePayload(payload)) {
            throw new Error(
                `Incoming message is invalid ${JSON.stringify(this.validateAlgorithmCreatePayload.errors)}`
            );
        }
    };

    public validateCampaignRequirementsSchema = (payload: object) => {
        if (!this.validateCampaignRequirementsPayload(payload)) {
            throw new Error(
                `Incoming message is invalid ${JSON.stringify(this.validateCampaignRequirementsPayload.errors)}`
            );
        }
    };

    public validateKycRegistration = (payload: object) => {
        if (!this.validateKycUser(payload)) {
            throw new Error(`Invalid kyc registration ${JSON.stringify(this.validateKycUser.errors)}`);
        }
    };

    public validateKycLevel1 = (payload: object) => {
        if (!this.validateKycUserLevel1(payload)) {
            throw new Error(`Invalid kyc registration ${JSON.stringify(this.validateKycUserLevel1.errors)}`);
        }
    };

    public validateKycLevel2 = (payload: object) => {
        if (!this.validateKycUserLevel2(payload)) {
            throw new Error(`Invalid kyc registration ${JSON.stringify(this.validateKycUserLevel2.errors)}`);
        }
    };

    public validateHourlyMetricsArgs = (payload: object) => {
        if (!this.validateHourlyMetrics(payload)) {
            throw new Error(`Invalid metrics request ${JSON.stringify(this.validateHourlyMetrics.errors)}`);
        }
    };
}
