import uuid from "uuid/v4";
import { Secrets } from "../util/secrets";
import { signFactor, getDeterministicId } from "../util/crypto";

export class Factor {
    public id: string;
    public name: string;
    public hashType: "sha256";
    public providerId: string;
    public signature: string;
    public factor: string;

    constructor(options: { id?: string; name: string; factor: string }) {
        this.name = options.name;
        this.id = options.id || uuid();
        this.factor = options.factor;
        this.providerId = getDeterministicId(Secrets.factorProviderPublicKey);
    }

    public sign() {
        this.signature = Buffer.from(signFactor(this)).toString("base64");
    }

    asAtRestV1() {
        return {
            providerId: getDeterministicId(Secrets.factorProviderPublicKey),
            id: this.id,
            name: this.name,
            factor: this.factor,
            hashType: "sha256",
            signature: this.signature,
        };
    }
}
