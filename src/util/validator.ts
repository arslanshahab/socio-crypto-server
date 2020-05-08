import Ajv from 'ajv';

const factorLoginSchema = {
  title: 'dragonfactorLoginSchema',
  type: 'object',
  properties: {
    service: { type: 'string', enum: ['raiinmaker'] },
    factorType: { type: 'string', enum: ['email'] },
    timestamp: { type: 'string' },
    factor: { type: 'string' },
    signingPublicKey: { type: 'string' },
    signature: { type: 'string' }
  },
  required: ['service','factorType','timestamp','factor','signingPublicKey','signature']
};

export class Validator {
  private ajv: any;
  private validateDragonfactorLoginPayload: (payload: object) => boolean;

  public constructor() {
    this.ajv = new Ajv({ schemaId: 'auto' });
    this.validateDragonfactorLoginPayload = this.ajv.compile(factorLoginSchema);
  }

  public validateDragonfactorLogin(payload: object) {
    if (!this.validateDragonfactorLoginPayload(payload)) {
      throw new Error(`invalid parameters for dragonfactor login: ${JSON.stringify((this.validateDragonfactorLoginPayload as any).errors)}`);
    }
  }
}