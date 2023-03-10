import { Injectable } from "@tsed/di";
import { getActionKey, getCampaignAuditKey, getAccountRecoveryAttemptKey, getSocialShareKey } from "../util/index";
import { Dragonchain } from "../clients/dragonchain";
import { TransactionType, ParticipantAction, SocialClientType, TransactionChainType } from "../util/constants";
import { BulkCampaignActionPayload, BulkCampaignPayoutPayload, NftFileParams, NftMintingParams } from "types.d.ts";
import { BulkTransactionPayload } from "dragonchain-sdk";
import { Transaction, PrismaPromise } from "@prisma/client";
import { prisma } from "../clients/prisma";
import { L1DragonchainTransactionFull } from "dragonchain-sdk";

@Injectable()
export class DragonChainService {
    public async ledgerCampaignAction(data: { action: ParticipantAction; participantId: string; campaignId: string }) {
        try {
            const { action, participantId, campaignId } = data;
            const tag = getActionKey(action, participantId);
            const res = await Dragonchain.client.createTransaction({
                transactionType: TransactionType.TRACK_ACTION,
                tag,
                payload: { action, participantId, campaignId },
            });
            if (!res.ok) throw new Error(JSON.stringify(res));
            const txId = res.response.transaction_id;
            await prisma.transaction.create({
                data: {
                    action,
                    participantId,
                    campaignId,
                    tag,
                    txId,
                    chain: TransactionChainType.DRAGON_CHAIN,
                    transactionType: TransactionType.TRACK_ACTION,
                },
            });
            return txId;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    public async ledgerSocialShare(data: { socialType: SocialClientType; participantId: string; campaignId: string }) {
        try {
            const { socialType, participantId, campaignId } = data;
            const tag = getSocialShareKey(socialType, participantId);
            const res = await Dragonchain.client.createTransaction({
                transactionType: TransactionType.SOCIAL_SHARE,
                tag,
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
                    chain: TransactionChainType.DRAGON_CHAIN,
                    transactionType: TransactionType.SOCIAL_SHARE,
                },
            });
            return txId;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    public async ledgerCampaignAudit(data: { payload: any; campaignId: string }) {
        try {
            const { payload, campaignId } = data;
            const tag = getCampaignAuditKey(campaignId);
            const res = await Dragonchain.client.createTransaction({
                transactionType: TransactionType.CAMPAIGN_AUDIT,
                tag,
                payload: { ...payload, campaignId },
            });
            if (!res.ok) throw new Error(JSON.stringify(res));
            const txId = res.response.transaction_id;
            await prisma.transaction.create({
                data: {
                    tag,
                    txId,
                    campaignId,
                    chain: TransactionChainType.DRAGON_CHAIN,
                    transactionType: TransactionType.CAMPAIGN_AUDIT,
                },
            });
            return txId;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    public async ledgerAccountRecoveryAttempt(
        accountId: string | undefined,
        identityId: string,
        username: string,
        recoveryCode: number,
        successful: boolean
    ) {
        try {
            const tag = getAccountRecoveryAttemptKey(accountId, username);
            const res = await Dragonchain.client.createTransaction({
                transactionType: TransactionType.ACCOUNT_RECOVERY,
                tag,
                payload: { identityId, accountId, username, recoveryCode, successful },
            });
            if (!res.ok) throw new Error(JSON.stringify(res));
            return res.response.transaction_id;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    public async ledgerBulkCampaignAction(data: BulkCampaignActionPayload[]) {
        try {
            const bulkPayload: BulkTransactionPayload[] = [];
            const prismaTransactions: PrismaPromise<Transaction>[] = [];
            for (const item of data) {
                const { action, participantId, campaignId, payload, socialType } = item;
                const tag = getActionKey(action, participantId);
                bulkPayload.push({
                    transactionType: TransactionType.TRACK_ACTION,
                    tag,
                    payload: { ...payload, participantId, campaignId, action, socialType },
                });
            }
            const res = await Dragonchain.client.createBulkTransaction({ transactionList: bulkPayload });
            if (!res.ok) throw new Error(JSON.stringify(res));
            const success = res.response[201];
            const failed = res.response[400];
            for (let index = 0; index < bulkPayload.length; index++) {
                const bulkData = bulkPayload[index];
                const dataItem = data[index];
                const txId = success[index].toString();
                if (failed.length && failed.find((f) => f.tag === bulkData.tag)) continue;
                prismaTransactions.push(
                    prisma.transaction.create({
                        data: {
                            participantId: dataItem.participantId,
                            action: dataItem.action,
                            tag: bulkData.tag!,
                            campaignId: dataItem.campaignId,
                            txId,
                            transactionType: TransactionType.TRACK_ACTION,
                            socialType: dataItem.socialType,
                            chain: TransactionChainType.DRAGON_CHAIN,
                        },
                    })
                );
            }
            await prisma.$transaction(prismaTransactions);
            return { success, failed };
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    public async ledgerBulkCampaignPayout(data: BulkCampaignPayoutPayload[]) {
        try {
            const bulkPayload: BulkTransactionPayload[] = [];
            const prismaTransactions: PrismaPromise<Transaction>[] = [];
            for (const item of data) {
                const { participantId, campaignId, payload } = item;
                const tag = getCampaignAuditKey(campaignId, participantId);
                bulkPayload.push({
                    transactionType: TransactionType.CAMPAIGN_AUDIT,
                    tag,
                    payload: { ...payload, participantId, campaignId },
                });
            }
            const res = await Dragonchain.client.createBulkTransaction({ transactionList: bulkPayload });
            if (!res.ok) throw new Error(JSON.stringify(res));
            const success = res.response[201];
            const failed = res.response[400];
            for (let index = 0; index < bulkPayload.length; index++) {
                const bulkData = bulkPayload[index];
                const dataItem = data[index];
                const txId = success[index].toString();
                if (failed.length && failed.find((f) => f.tag === bulkData.tag)) continue;
                prismaTransactions.push(
                    prisma.transaction.create({
                        data: {
                            participantId: dataItem.participantId!,
                            tag: bulkData.tag!,
                            campaignId: dataItem.campaignId,
                            txId,
                            transactionType: TransactionType.CAMPAIGN_PAYOUT,
                            chain: TransactionChainType.DRAGON_CHAIN,
                        },
                    })
                );
            }
            await prisma.$transaction(prismaTransactions);
            return { success, failed };
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    public async getTransaction(transactionId: string): Promise<L1DragonchainTransactionFull> {
        const res = await Dragonchain.client.getTransaction({ transactionId });
        if (!res.ok) throw new Error("Failed to fetch transaction from dragonchain");
        return res.response;
    }

    public async getBulkTransaction(ids: string[]): Promise<L1DragonchainTransactionFull[]> {
        const promiseArray: Promise<any>[] = [];
        for (const id of ids) {
            promiseArray.push(this.getTransaction(id));
        }
        return await Promise.all(promiseArray);
    }

    public async mintNFT(data: NftMintingParams) {
        const { userId, name, type, nftId } = data;
        const res = await Dragonchain.client.createTransaction({
            transactionType: TransactionType.NFT_MINT,
            tag: nftId,
            payload: {
                nftid: nftId,
                name: name,
                type: type,
                owner: userId,
                note: "NFT minted by Raiinmaker",
            },
        });
        if (!res.ok) throw new Error("Failed to ledger account recovery to the Dragonchain");
        return res.response.transaction_id;
    }

    public async attachFileToNFT(data: NftFileParams) {
        const { nftId, mintTxId, file } = data;
        const res = await Dragonchain.client.createTransaction({
            transactionType: TransactionType.NFT_ADD_FILE,
            tag: nftId,
            payload: {
                nftid: nftId,
                file,
                mintTxId,
            },
        });
        if (!res.ok) throw new Error("Failed to ledger account recovery to the Dragonchain");
        return res.response.transaction_id;
    }
}
