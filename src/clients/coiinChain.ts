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
        const actionHash = crypto.createHash("sha256").update(sortedAction.encode("utf-8"));

        const sortedPayload = Object.keys(payload)
            .sort()
            .reduce((obj: { [key: string]: any }, key) => {
                obj[key] = payload[key];
                return obj;
            }, {});
        const payloadHash = crypto.createHash("sha256").update(sortedPayload.encode("utf-8"));
        const sig = this.xorBytes(this.xorBytes(payloadHash.digest(), identityHash.digest()), actionHash.digest());

        const seal = {
            full: String(payloadHash.digest("hex")),
            identity: String(identityHash.digest()),
            action: String(actionHash.digest()),
            signature: sig.toString("hex"),
        };
        return seal;
    }

    public static async logAction(data: any) {
        const tag = getActionKey(data.action, data.participantId);
        return false;
    }
}
