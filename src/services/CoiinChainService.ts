import { Injectable } from "@tsed/di";
import { getActionKey, getSocialShareKey } from "../util/index";
import {
    TransactionType,
    ParticipantAction,
    SocialClientType,
    TransactionChainType,
    PRIOR_APP_SIGNATURE_KEY,
} from "../util/constants";
import { prisma } from "../clients/prisma";
import { generateRandomUuid } from "../util/index";
import crypto from "crypto";
import { RequestData, doFetch } from "../util/fetchRequest";
import { getRedis } from "../clients/redis";
import sort from "sort-keys-recursive";

interface User_Participant_Campaign {
    userId: string;
    participantId: string;
    campaignId: string;
}

type Seal = {
    full: string;
    identity: string;
    action: string;
    signature: string;
};

type Factor = {
    factor: string;
    factorId: string;
    note: string;
};

type Identity = {
    version: string;
    userId: string;
    factors: Factor[];
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

@Injectable()
export class CoiinChainService {
    private appName = "RAIINMAKER";
    private baseUrl = "https://savvy-equator-363816.uc.r.appspot.com";

    private xorBytes(left: Buffer, right: Buffer) {
        const bytesArray = [];
        for (let i = 0; i < left.length; i++) {
            bytesArray.push(left[i] ^ right[i]);
        }
        return Buffer.from(bytesArray);
    }

    private createSeal(payload: TransactionPayload) {
        const { seal, ...rest } = payload;

        const options = { ignoreArrayAtKeys: ["publicKeys"] };
        const restSorted = sort(rest, options);

        const identityHash = crypto.createHash("sha256").update(Buffer.from(restSorted.identity.userId, "utf-8"));
        if (restSorted.identity?.factors) {
            for (const factor of restSorted.identity.factors) {
                identityHash.update(Buffer.from(factor.factorId, "utf-8"));
                identityHash.update(Buffer.from(factor.factor, "utf-8"));
                identityHash.update(Buffer.from(factor.note, "utf-8"));
            }
        }

        if (restSorted.identity?.publicKeys) {
            for (const key of restSorted.identity.publicKeys) {
                identityHash.update(Buffer.from(key, "utf-8"));
            }
        }

        const identityHashHex = identityHash.digest("hex");
        const sortedActionHashHex = crypto
            .createHash("sha256")
            .update(Buffer.from(JSON.stringify(restSorted.action), "utf-8"))
            .digest("hex");
        const sortedPayloadHashHex = crypto
            .createHash("sha256")
            .update(Buffer.from(JSON.stringify(restSorted), "utf-8"))
            .digest("hex");
        const signature = this.xorBytes(
            this.xorBytes(Buffer.from(sortedPayloadHashHex, "hex"), Buffer.from(identityHashHex, "hex")),
            Buffer.from(sortedActionHashHex, "hex")
        );

        return {
            full: sortedPayloadHashHex,
            identity: identityHashHex,
            action: sortedActionHashHex,
            signature: signature.toString("hex"),
        };
    }

    public async getPriorUASignature() {
        const lastCoiinTransaction = await prisma.transaction.findFirst({
            where: { chain: TransactionChainType.COIIN_CHAIN },
            orderBy: { createdAt: "desc" },
        });
        return lastCoiinTransaction?.signature || "";
    }

    private async fetchPriorAppSignature(limit = 1) {
        const url = `${this.baseUrl}/api/v1/block/hashes/${this.appName}`;
        const requestData: RequestData = {
            method: "GET",
            url,
            query: { limit },
        };
        return await doFetch(requestData);
    }

    public async getPriorAppSignature() {
        let signature = await getRedis().get(PRIOR_APP_SIGNATURE_KEY);
        if (signature) {
            signature = JSON.parse(signature);
            return {
                priorApp: signature.app[0] || "",
                priorCoiin: signature.app[0] || "",
            };
        }
        signature = await this.fetchPriorAppSignature();
        await getRedis().set(PRIOR_APP_SIGNATURE_KEY, JSON.stringify(signature));
        await getRedis().expire(PRIOR_APP_SIGNATURE_KEY, 600);
        return {
            priorApp: signature.app[0] || "",
            priorCoiin: signature.app[0] || "",
        };
    }

    private async createPayload(userId: string, action: Record<string, string>) {
        const { priorApp, priorCoiin } = await this.getPriorAppSignature();
        const priorUa = await this.getPriorUASignature();
        const payload = {
            header: {
                uaid: generateRandomUuid(),
                timestamp: String(new Date().getTime()),
                app: this.appName,
                priorUa,
                priorApp,
                priorCoiin,
            },
            action,
            identity: {
                version: "1",
                userId: userId,
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

    public async logAction(data: {
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

    public async ledgerCampaignAction(data: { action: ParticipantAction } & User_Participant_Campaign) {
        try {
            const { action, participantId, campaignId, userId } = data;
            const tag = getActionKey(action, participantId);
            const res = await this.logAction({
                userId,
                tag,
                transactionType: TransactionType.TRACK_ACTION,
                payload: { action, participantId, campaignId },
            });
            console.log(res);
            await prisma.transaction.create({
                data: {
                    action,
                    participantId,
                    campaignId,
                    tag,
                    txId: "",
                    signature: "",
                    chain: TransactionChainType.COIIN_CHAIN,
                    transactionType: TransactionType.TRACK_ACTION,
                },
            });
            return res;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    public async ledgerSocialShare(data: { socialType: SocialClientType } & User_Participant_Campaign) {
        try {
            const { socialType, participantId, campaignId, userId } = data;
            const tag = getSocialShareKey(socialType, participantId);
            const res = await this.logAction({
                userId,
                tag,
                transactionType: TransactionType.SOCIAL_SHARE,
                payload: { participantId, socialType },
            });
            if (!res.ok) throw new Error(JSON.stringify(res));
            const txId = res.response.transaction_id;
            await prisma.transaction.create({
                data: {
                    socialType,
                    participantId,
                    campaignId,
                    tag,
                    txId,
                    chain: TransactionChainType.COIIN_CHAIN,
                    transactionType: TransactionType.SOCIAL_SHARE,
                },
            });
            return txId;
        } catch (error) {
            console.log(error);
            return null;
        }
    }
}
