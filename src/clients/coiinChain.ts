import { generateRandomUuid } from "../util/index";
import crypto from "crypto";
import { PRIOR_APP_SIGNATURE_KEY, TransactionType } from "../util/constants";
import { RequestData, doFetch } from "../util/fetchRequest";
import { getRedis } from "./redis";

type Seal = {
    full: string;
    identity: string;
    action: string;
    signature: string;
};

type Identity = {
    version: string;
    user_id: string;
    factors: any[];
    publicKeys: any[];
};

type Header = {
    uaid: string;
    timestamp: string;
    app: string;
    priorUa: string;
    priorApp: string;
    priorCoiin: string;
};
interface TransactionPayload {
    [key: string]: Header | Identity | Seal | Record<string, string>;
    header: Header;
    action: Record<string, string>;
    identity: Identity;
    seal: Seal;
}

export class CoiinChain {
    private static appName = "RAIINMAKER";
    private static baseUrl = "https://savvy-equator-363816.uc.r.appspot.com";

    private static xorBytes(left: Buffer, right: Buffer) {
        const bytesArray = [];
        for (const index in left) {
            bytesArray.push(left[index] ^ right[index]);
        }
        return Buffer.from(bytesArray);
    }

    private static createSeal(payload: TransactionPayload) {
        const { seal, ...rest } = payload;
        const identity = rest.identity;
        const action = rest.action;
        const identityHash = crypto.createHash("sha256").update(Buffer.from(identity.user_id, "utf-8"));
        if (identity?.factors) {
            for (const factor of identity.factors) {
                identityHash.update(Buffer.from(factor.factorId, "utf-8"));
                identityHash.update(Buffer.from(factor.factor, "utf-8"));
                identityHash.update(Buffer.from(factor.note, "utf-8"));
            }
        }

        if (identity?.publicKeys) {
            for (const key of identity.publicKeys) {
                identityHash.update(Buffer.from(key, "utf-8"));
            }
        }

        const identityHashHex = identityHash.digest("hex");

        const sortedAction = Object.keys(action)
            .sort()
            .reduce((obj: { [key: string]: any }, key) => {
                obj[key] = action[key];
                return obj;
            }, {});
        const sortedActionHash = crypto
            .createHash("sha256")
            .update(Buffer.from(JSON.stringify(sortedAction), "utf-8"))
            .digest("hex");

        const sortedPayload = Object.keys(rest)
            .sort()
            .reduce((obj: { [key: string]: any }, key) => {
                obj[key] = rest[key];
                return obj;
            }, {});
        const sortedPayloadHash = crypto
            .createHash("sha256")
            .update(Buffer.from(JSON.stringify(sortedPayload), "utf-8"))
            .digest("hex");

        const signature = this.xorBytes(
            this.xorBytes(Buffer.from(sortedPayloadHash, "hex"), Buffer.from(identityHashHex, "hex")),
            Buffer.from(sortedActionHash, "hex")
        );

        return {
            full: sortedPayloadHash,
            identity: identityHashHex,
            action: sortedActionHash,
            signature: signature.toString("hex"),
        };
    }

    private static async createPayload(userId: string, action: Record<string, string>) {
        // const priorBlockData = await this.getPriorAppSignature();
        const payload = {
            header: {
                uaid: generateRandomUuid(),
                timestamp: String(new Date().getTime()),
                app: this.appName,
                priorUa: "",
                priorApp: "",
                priorCoiin: "",
            },
            action,
            identity: {
                version: "1",
                user_id: userId,
                factors: [],
                publicKeys: [],
            },
            seal: {
                full: "",
                identity: "",
                action: "",
                signature: "",
            },
        };
        const seal = this.createSeal(payload);
        return { ...payload, seal };
    }

    private static async fetchPriorAppSignature(limit = 1) {
        const url = `${this.baseUrl}/api/v1/block/hashes/${this.appName}`;
        const requestData: RequestData = {
            method: "GET",
            url,
            query: { limit },
        };
        return await doFetch(requestData);
    }

    public static async getPriorAppSignature() {
        let signature = await getRedis().get(PRIOR_APP_SIGNATURE_KEY);
        if (signature) {
            signature = JSON.parse(signature);
            return signature;
        }
        signature = await this.fetchPriorAppSignature();
        await getRedis().set(PRIOR_APP_SIGNATURE_KEY, JSON.stringify(signature));
        await getRedis().expire(PRIOR_APP_SIGNATURE_KEY, 600);
        return signature;
    }

    public static async logAction(data: {
        userId: string;
        tag: string;
        transactionType: TransactionType;
        payload: { [key: string]: any };
    }) {
        const { userId, tag, transactionType, payload } = data;
        const url = `${this.baseUrl}/api/v1/action`;
        const transactionPayload = await this.createPayload(userId, { ...payload, tag, transactionType });
        console.log(transactionPayload);
        const requestData: RequestData = {
            method: "PUT",
            url,
            payload: transactionPayload,
        };
        return await doFetch(requestData);
    }
}
