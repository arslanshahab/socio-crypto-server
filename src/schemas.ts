import Ajv from "ajv";

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
                city: { type: "string" },
                state: { type: "string" },
                country: { type: "string" },
            },
        },
        socialFollowing: {
            type: "object",
            twitter: {
                type: "object",
                minFollower: {
                    type: "string",
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

export const kycUser = {
    type: "object",
    properties: {
        firstName: { type: "string" },
        middleName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string" },
        billingStreetAddress: { type: "string" },
        billingCity: { type: "string" },
        billingCountry: { type: "string" },
        billingZip: { type: "number" },
        gender: { type: "string" },
        dob: { type: "string" },
        phoneNumber: { type: "string" },
        documentType: { type: "string" },
        documentCountry: { type: "string" },
        frontDocumentImage: { type: "string" },
        faceImage: { type: "string" },
        backDocumentImage: { type: "string" },
    },
    required: [
        "firstName",
        "lastName",
        "billingStreetAddress",
        "billingCity",
        "billingCountry",
        "billingZip",
        "gender",
        "dob",
        "phoneNumber",
        "documentType",
        "documentCountry",
        "frontDocumentImage",
        "backDocumentImage",
        "faceImage",
    ],
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
    private ajv: Ajv.Ajv;
    private validateAlgorithmCreatePayload: Ajv.ValidateFunction;
    private validateCampaignRequirementsPayload: Ajv.ValidateFunction;
    private validateKycUser: Ajv.ValidateFunction;
    private validateHourlyMetrics: Ajv.ValidateFunction;
    private validateRafflePrizePayload: Ajv.ValidateFunction;

    public constructor() {
        this.ajv = new Ajv({ schemaId: "auto" });
        this.validateAlgorithmCreatePayload = this.ajv.compile(algorithmCreateSchema);
        this.validateCampaignRequirementsPayload = this.ajv.compile(campaignRequirementsSchema);
        this.validateKycUser = this.ajv.compile(kycUser);
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
    public validateHourlyMetricsArgs = (payload: object) => {
        if (!this.validateHourlyMetrics(payload)) {
            throw new Error(`Invalid metrics request ${JSON.stringify(this.validateHourlyMetrics.errors)}`);
        }
    };
}
