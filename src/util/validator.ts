import Ajv from 'ajv';

const factorLoginSchema = {
  title: 'dragonfactorLoginSchema',
  type: 'object',
  properties: {
    service: { type: 'string' },
    factorType: { type: 'string', enum: ['email'] },
    
  }
};

export class Validator {
  private ajv: any;
  private validateDragonfactorLoginPayload: (payload: object) => boolean;

  public constructor() {
    this.ajv = new Ajv({ schemaId: 'auto' });
  }
}