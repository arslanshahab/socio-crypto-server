import { calculateParticipantPayout, calculateTier } from "../../controllers/helpers";
import { BN } from "../../util";
import {
    CampaignAuditStatus,
    CAMPAIGN_FEE,
    FEE_RATE,
    RAIINMAKER_ORG_NAME,
    TransferAction,
    TransferStatus,
    TransferType,
} from "../../util/constants";
import { TatumClient, BatchTransferPayload } from "../../clients/tatumClient";
import { Campaign, Prisma } from "@prisma/client";
import { prisma, readPrisma } from "../../clients/prisma";
import { Tiers, BulkCampaignPayoutPayload } from "types.d.ts";
import { DragonChainService } from "../../services/DragonChainService";
import { CoiinChainService } from "../../services/CoiinChainService";

const dragonChainService = new DragonChainService();
const coiinChainService = new CoiinChainService();

// export const payoutRaffleCampaignRewards = async (
//     entityManager: EntityManager,
//     campaign: Campaign,
//     rejected: string[]
// ) => {
//     if (!campaign.prize) throw new Error("no campaign prize");
//     if (campaign.participants.length === 0) throw new Error("no participants on campaign for audit");
//     let totalParticipationScore = new BN(0).plus(campaign.totalParticipationScore);
//     const clonedParticipants =
//         rejected.length > 0
//             ? campaign.participants.reduce((accum: Participant[], current: Participant) => {
//                   if (rejected.indexOf(current.id) > -1)
//                       totalParticipationScore = totalParticipationScore.minus(current.participationScore);
//                   else accum.push(current);
//                   return accum;
//               }, [])
//             : campaign.participants;
//     const winner = calculateRaffleWinner(totalParticipationScore, clonedParticipants);
//     const wallet = await Wallet.findOneOrFail({ where: { user: winner.user } });
//     const prize = await RafflePrize.findOneOrFail({
//         where: { id: campaign.prize.id },
//     });
//     const transfer = Transfer.newFromRaffleSelection(wallet, campaign, prize);
//     campaign.auditStatus = "AUDITED";
//     await entityManager.save([campaign, wallet, transfer]);
//     await SesClient.sendRafflePrizeRedemptionEmail(winner.user.id, decrypt(winner.email), campaign);
//     // await Dragonchain.ledgerRaffleCampaignAudit({ [winner.user.id]: campaign.prize.displayName }, [], campaign.id);
//     return { [winner.user.id]: winner.user.profile.deviceToken };
// };

export const payoutCryptoCampaignRewards = async (campaign: Campaign) => {
    try {
        if (!campaign?.tatumBlockageId) throw new Error(`No blockage Id found for campaign--- ${campaign.id}`);
        await TatumClient.unblockAccountBalance(campaign.tatumBlockageId);
        const userDeviceIds: { [key: string]: string } = {};
        const { currentTotal } = calculateTier(
            new BN(campaign.totalParticipationScore),
            (campaign.algorithm as Prisma.JsonObject).tiers as Prisma.JsonObject as unknown as Tiers
        );
        let totalRewardAmount = new BN(currentTotal);
        let raiinmakerFee = new BN(0);
        let totalPayout = new BN(0);
        const campaignFee = totalRewardAmount.multipliedBy(FEE_RATE);
        raiinmakerFee = raiinmakerFee.plus(campaignFee);
        totalRewardAmount = totalRewardAmount.minus(campaignFee);
        const campaignCurrency = await readPrisma.currency.findFirst({
            where: {
                id: campaign?.currencyId || "",
            },
        });
        if (!campaignCurrency) throw new Error("Campaign currency not found.");
        const campaignToken = await readPrisma.token.findFirst({ where: { id: campaignCurrency?.tokenId || "" } });
        if (!campaignToken) throw new Error("Campaign token not found.");
        const raiinmakerOrg = await readPrisma.org.findFirst({ where: { name: RAIINMAKER_ORG_NAME } });
        const raiinmakerWallet = await readPrisma.wallet.findFirst({ where: { orgId: raiinmakerOrg?.id } });
        const raiinmakerCurrency = await readPrisma.currency.findFirst({
            where: { tokenId: campaignToken?.id, walletId: raiinmakerWallet?.id },
        });
        if (!raiinmakerCurrency) throw new Error("currency not found for raiinmaker");
        if (!campaignCurrency) throw new Error("currency not found for campaign");
        const take = 100;
        let skip = 0;
        const totalParticipants = await readPrisma.participant.count({
            where: { campaignId: campaign.id, blacklist: false },
        });
        const blacklistedParticipants = await readPrisma.participant.count({
            where: { campaignId: campaign.id, blacklist: true },
        });
        const paginatedLoop = Math.ceil(totalParticipants / take);

        // transfer campaign fee to raiinmaker tatum account
        if (campaign?.orgId !== raiinmakerOrg?.id) {
            await TatumClient.transferFunds({
                senderAccountId: campaignCurrency.tatumId,
                recipientAccountId: raiinmakerCurrency.tatumId,
                amount: raiinmakerFee?.toString(),
                recipientNote: `${CAMPAIGN_FEE}:${campaign.id}`,
            });
        }

        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const participants = await readPrisma.participant.findMany({
                where: { campaignId: campaign.id, blacklist: false },
                take,
                skip,
            });
            const transferRecords = [];
            const dragonchainTransactions: BulkCampaignPayoutPayload[] = [];
            const batchTransfer: BatchTransferPayload = {
                senderAccountId: "",
                transaction: [],
            };
            batchTransfer.senderAccountId = campaignCurrency.tatumId;
            for (let index = 0; index < participants.length; index++) {
                const participant = participants[index];
                const userData = await readPrisma.user.findFirst({
                    where: { id: participant.userId },
                });
                if (!userData) throw new Error(`User not found for ID: ${participant?.userId}`);
                const userProfile = await readPrisma.profile.findFirst({ where: { userId: userData?.id } });
                if (!userProfile) throw new Error(`Profile not found for user: ${userData?.id}`);
                const userWallet = await readPrisma.wallet.findFirst({ where: { userId: userData?.id } });
                if (!userWallet) throw new Error(`Wallet not found for user: ${userData.id}`);
                const userCurrency = await TatumClient.findOrCreateCurrency({
                    symbol: campaignToken?.symbol || "",
                    network: campaignToken?.network || "",
                    walletId: userWallet.id,
                });
                if (!userCurrency)
                    throw new Error(`Currency not found for wallet: ${userWallet.id} and token: ${campaignToken?.id}`);
                if (userProfile?.deviceToken) userDeviceIds[userData.id] = userProfile?.deviceToken;
                const participantShare = await calculateParticipantPayout(totalRewardAmount, campaign, participant);
                const alreadyTransferred = await readPrisma.transfer.findFirst({
                    where: {
                        amount: participantShare.toString(),
                        campaignId: campaign.id,
                        walletId: userWallet?.id,
                    },
                });
                if (participantShare.isGreaterThan(0) && !alreadyTransferred) {
                    batchTransfer.transaction.push({
                        recipientAccountId: userCurrency.tatumId,
                        amount: participantShare.toString(),
                    });
                    totalPayout = totalPayout.plus(participantShare);
                    transferRecords.push({
                        currency: campaignToken?.symbol,
                        campaignId: campaign.id,
                        amount: participantShare.toString(),
                        ethAddress: userCurrency.tatumId,
                        walletId: userWallet.id,
                        action: TransferAction.CAMPAIGN_REWARD,
                        status: TransferStatus.SUCCEEDED,
                        type: TransferType.CREDIT,
                    });
                    dragonchainTransactions.push({
                        userId: userData.id,
                        campaignId: campaign.id,
                        participantId: participant.id,
                        payload: {
                            symbol: campaignToken.symbol,
                            network: campaignToken.network,
                            amount: participantShare.toString(),
                            participationScore: participant.participationScore.toString(),
                        },
                    });
                    console.log(
                        "TRANSFER PREPARED ---- ",
                        participant.id,
                        participantShare.toString(),
                        campaignCurrency.tatumId,
                        userCurrency.tatumId
                    );
                }
            }

            if (batchTransfer.transaction.length) await TatumClient.transferFundsBatch(batchTransfer);
            await prisma.transfer.createMany({ data: transferRecords });
            if (dragonchainTransactions.length)
                await dragonChainService.ledgerBulkCampaignPayout(dragonchainTransactions);
            await coiinChainService.ledgerBulkCampaignPayout(dragonchainTransactions);
            skip += take;
        }
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { auditStatus: CampaignAuditStatus.AUDITED },
        });
        await prisma.transfer.create({
            data: {
                walletId: raiinmakerWallet?.id!,
                amount: totalPayout.toString(),
                status: TransferStatus.SUCCEEDED,
                action: TransferAction.CAMPAIGN_REWARD_PAYOUT,
                type: TransferType.DEBIT,
                campaignId: campaign.id,
                ethAddress: raiinmakerCurrency.tatumId,
                currency: campaignToken.symbol,
            },
        });
        await dragonChainService.ledgerCampaignAudit({
            campaignId: campaign.id,
            payload: {
                totalPayout: totalPayout.toString(),
                totalParticipants,
                blacklistedParticipants,
                totalParticipationScore: campaign.totalParticipationScore,
                campaignName: campaign.name,
                symbol: campaignToken.symbol,
                network: campaignToken.network,
                totalBudget: campaign.coiinTotal,
            },
        });
        await coiinChainService.ledgerCampaignAudit({
            campaignId: campaign.id,
            payload: {
                totalPayout: totalPayout.toString(),
                totalParticipants,
                blacklistedParticipants,
                totalParticipationScore: campaign.totalParticipationScore,
                campaignName: campaign.name,
                symbol: campaignToken.symbol,
                network: campaignToken.network,
                totalBudget: campaign.coiinTotal,
            },
        });
        return userDeviceIds;
    } catch (error) {
        throw new Error(error.message);
    }
};
