import Ajv from "ajv";
import { RAIINMAKER_ORG_NAME } from "./constants";

const factorAssociation = {
    type: "object",
    properties: {
        publicKey: { type: "string" },
        publicSignSignature: { type: "string" },
        signPublicSignature: { type: "string" },
    },
    required: ["publicKey", "publicSignSignature", "signPublicSignature"],
};

const factorLoginSchema = {
    title: "dragonfactorLoginSchema",
    type: "object",
    properties: {
        service: { type: "string", enum: [RAIINMAKER_ORG_NAME] },
        factorType: { type: "string", enum: ["email"] },
        timestamp: { type: "string" },
        factor: { type: "string" },
        signingPublicKey: { type: "string" },
        signature: { type: "string" },
        factorAssociation: factorAssociation,
    },
    required: ["service", "factorType", "timestamp", "factor", "signingPublicKey", "signature", "factorAssociation"],
};

export class Validator {
    private ajv: any;
    private validateDragonfactorLoginPayload: (payload: object) => boolean;

    public constructor() {
        this.ajv = new Ajv({ schemaId: "id" });
        this.validateDragonfactorLoginPayload = this.ajv.compile(factorLoginSchema);
    }

    public validateDragonfactorLogin(payload: object) {
        if (!this.validateDragonfactorLoginPayload(payload)) {
            throw new Error(
                `invalid parameters for dragonfactor login: ${JSON.stringify(
                    (this.validateDragonfactorLoginPayload as any).errors
                )}`
            );
        }
    }
}
