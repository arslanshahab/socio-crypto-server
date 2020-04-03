import Ajv from 'ajv';
import {FailureByDesign} from "./errors";

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
                    '4': {
                        type: 'object',
                        properties: {
                            threshold: {type: 'string'},
                            totalCoiins: {type: 'string'}
                        },
                        '5': {
                            type: 'object',
                            properties: {
                                threshold: {type: 'string'},
                                totalCoiins: {type: 'string'}
                            },
                        }
                    }
                }
            }
        }
    }
};

export class Validator {
    private ajv: Ajv.Ajv;
    private validateAlgorithmCreatePayload: Ajv.ValidateFunction;

    public constructor() {
        this.ajv = new Ajv({schemaId: 'auto'});
        this.validateAlgorithmCreatePayload = this.ajv.compile(algorithmCreateSchema);
    }

    public validateAlgorithmCreateSchema = (payload: object) => {
        if(!this.validateAlgorithmCreatePayload(payload)) {
            throw new Error(`Incoming message is invalid ${JSON.stringify(this.validateAlgorithmCreatePayload.errors)}`);
        }
    }

}
