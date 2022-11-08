import { getActionKey } from "../util/index";
import crypto from "crypto";

export class CoiinChain {
    private xorBytes(a: Buffer, b: Buffer) {
        const bytesArray = [];
        for (const index in a) {
            bytesArray.push(a[index] ^ b[index]);
        }
        return Buffer.from(bytesArray);
    }

    private createSeal(payload: { [key: string]: any }) {
        if (payload["seal"]) delete payload["seal"];
        const identity = payload["identity"];
        const action = payload["action"];
        let identityHash = crypto.createHash("sha256").update(identity["userId"].encode("utf-8"));
        if (identity["factors"]) {
            for (const factor of identity["factors"]) {
                identityHash = identityHash.update(factor["factorId"].encode("utf-8"));
                identityHash = identityHash.update(factor["factor"].encode("utf-8"));
                identityHash = identityHash.update(factor["note"].encode("utf-8"));
            }
        }
        if (identity["publicKeys"]) {
            for (const key of identity["publicKeys"]) {
                identityHash = identityHash.update(key.encode("utf-8"));
            }
        }

        const sortedAction = Object.keys(action)
            .sort()
            .reduce((obj: { [key: string]: any }, key) => {
                obj[key] = action[key];
                return obj;
            }, {});
        const sortedActionHash = crypto.createHash("sha256").update(sortedAction.encode("utf-8"));

        const sortedPayload = Object.keys(payload)
            .sort()
            .reduce((obj: { [key: string]: any }, key) => {
                obj[key] = payload[key];
                return obj;
            }, {});
        const sortedPayloadHash = crypto.createHash("sha256").update(sortedPayload.encode("utf-8"));

        const signature = this.xorBytes(
            this.xorBytes(sortedPayloadHash.digest(), identityHash.digest()),
            sortedActionHash.digest()
        );

        return {
            full: String(sortedPayloadHash.digest("hex")),
            identity: String(identityHash.digest()),
            action: String(sortedActionHash.digest()),
            signature: signature.toString("hex"),
        };
    }

    public static async logAction(data: any) {
        const tag = getActionKey(data.action, data.participantId);
        return false;
    }
}
