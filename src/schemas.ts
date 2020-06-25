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
    private validateKycUser: Ajv.ValidateFunction;

    public constructor() {
        this.ajv = new Ajv({schemaId: 'auto'});
        this.validateAlgorithmCreatePayload = this.ajv.compile(algorithmCreateSchema);
        this.validateKycUser = this.ajv.compile(kycUser);
    }

    public validateAlgorithmCreateSchema = (payload: object) => {
        if (!this.validateAlgorithmCreatePayload(payload)) {
            throw new Error(`Incoming message is invalid ${JSON.stringify(this.validateAlgorithmCreatePayload.errors)}`);
        }
    }
    public validateKycRegistration = (payload: object) => {
        if (!this.validateKycUser(payload)) {
            throw new Error(`Invalid kyc registration ${JSON.stringify(this.validateKycUser.errors)}`);
        }
    }

}
