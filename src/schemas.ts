import Ajv from 'ajv';

export const algorithmCreateSchema = {
    type: 'object',
    properties: {
        version: {type: 'string'},
        pointValues: {
            type: 'object',
            properties: {
                click: {type: 'string'},
                view: {type: 'string'},
                submission: {type: 'string'},
            }
        },
        tiers: {
            type: 'object',
            properties: {
                '1': {
                    type: 'object',
                    properties: {
                        threshold: {type: 'string'},
                        totalCoiins: {type: 'string'}
                    },
                },
                '2': {
                    type: 'object',
                    properties: {
                        threshold: {type: 'string'},
                        totalCoiins: {type: 'string'}
                    },
                },
                '3': {
                    type: 'object',
                    properties: {
                        threshold: {type: 'string'},
                        totalCoiins: {type: 'string'}
                    },
                },
                '4': {
                    type: 'object',
                    properties: {
                        threshold: {type: 'string'},
                        totalCoiins: {type: 'string'}
                    },
                },
                '5': {
                    type: 'object',
                    properties: {
                        threshold: {type: 'string'},
                        totalCoiins: {type: 'string'}
                    },
                },
                '6': {
                    type: 'object',
                    properties: {
                        threshold: {type: 'string'},
                        totalCoiins: {type: 'string'}
                    },
                },
                '7': {
                    type: 'object',
                    properties: {
                        threshold: {type: 'string'},
                        totalCoiins: {type: 'string'}
                    },
                },
                '8': {
                    type: 'object',
                    properties: {
                        threshold: {type: 'string'},
                        totalCoiins: {type: 'string'}
                    },
                },
                '9': {
                    type: 'object',
                    properties: {
                        threshold: {type: 'string'},
                        totalCoiins: {type: 'string'}
                    },
                },
                '10': {
                    type: 'object',
                    properties: {
                        threshold: {type: 'string'},
                        totalCoiins: {type: 'string'}
                    },
                },
            }
        }
    }
};

export const campaignRequirementsSchema = {
    type: 'object',
    properties: {
      version: { type: 'string' },
      ageRange: {
        type: 'object',
        properties: {
          "0-17": {type: 'boolean'},
          "18-25": {type: 'boolean'},
          "26-40": {type: 'boolean'},
          "41-55": {type: 'boolean'},
          "55+": {type: 'boolean'},
        }
      },
    }
};

export const hourlyMetrics = {
    type: 'object',
    properties: {
        campaignId: {type: 'string'},
        filter: {
            type: 'string',
            enum: ['hour', 'day', 'week', 'month', 'quarter', 'year', 'all']
        }
    }
}


export const kycUser = {
    type: 'object',
    properties: {
        firstName: {type: 'string'},
        lastName: {type: 'string'},
        businessName: {type: 'string'},
        email: {type: 'string'},
        address: {type: 'object'},
        phoneNumber: {type: 'string'},
        paypalEmail: {type: 'string'},
        idProof: {type: 'string'},
        addressProof: {type: 'string'},
        exceptions: {type: 'string'},
        typeOfStructure: {type: 'string'},
        accountNumbers: {type: 'string'},
        ssn: {type: 'string'},
    }
}

export class Validator {
    private ajv: Ajv.Ajv;
    private validateAlgorithmCreatePayload: Ajv.ValidateFunction;
    private validateCampaignRequirementsPayload: Ajv.ValidateFunction;
    private validateKycUser: Ajv.ValidateFunction;
    private validateHourlyMetrics: Ajv.ValidateFunction;

    public constructor() {
        this.ajv = new Ajv({schemaId: 'auto'});
        this.validateAlgorithmCreatePayload = this.ajv.compile(algorithmCreateSchema);
        this.validateCampaignRequirementsPayload = this.ajv.compile(campaignRequirementsSchema);
        this.validateKycUser = this.ajv.compile(kycUser);
        this.validateHourlyMetrics = this.ajv.compile(hourlyMetrics);
    }

    public validateAlgorithmCreateSchema = (payload: object) => {
        if (!this.validateAlgorithmCreatePayload(payload)) {
            throw new Error(`Incoming message is invalid ${JSON.stringify(this.validateAlgorithmCreatePayload.errors)}`);
        }
    }

  public validateCampaignRequirementsSchema = (payload: object) => {
        if (!this.validateCampaignRequirementsPayload(payload)) {
            throw new Error(`Incoming message is invalid ${JSON.stringify(this.validateCampaignRequirementsPayload.errors)}`);
        }
    }
    public validateKycRegistration = (payload: object) => {
        if (!this.validateKycUser(payload)) {
            throw new Error(`Invalid kyc registration ${JSON.stringify(this.validateKycUser.errors)}`);
        }
    }
    public validateHourlyMetricsArgs = (payload: object) => {
        if (!this.validateHourlyMetrics(payload)) {
            throw new Error(`Invalid metrics request ${JSON.stringify(this.validateHourlyMetrics.errors)}`);
        }
    }

}
