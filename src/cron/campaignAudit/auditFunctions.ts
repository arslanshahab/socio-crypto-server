import { calculateParticipantPayout, calculateTier } from "../../controllers/helpers";
import { BN } from "../../util";
import { CampaignAuditStatus, FEE_RATE, RAIINMAKER_ORG_NAME } from "../../util/constants";
import { TatumClient, CAMPAIGN_REWARD, CAMPAIGN_FEE } from "../../clients/tatumClient";
import { Campaign, Prisma } from "@prisma/client";
import { prisma } from "../../clients/prisma";
import { Tiers } from "../../types.d";

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
        const userDeviceIds: { [key: string]: string } = {};
        const { currentTotal } = calculateTier(
            new BN(campaign.totalParticipationScore),
            (campaign.algorithm as Prisma.JsonObject).tiers as Prisma.JsonObject as unknown as Tiers
        );
        let totalRewardAmount = new BN(currentTotal);
        let raiinmakerFee = new BN(0);
        const campaignFee = totalRewardAmount.multipliedBy(FEE_RATE);
        raiinmakerFee = raiinmakerFee.plus(campaignFee);
        totalRewardAmount = totalRewardAmount.minus(campaignFee);
        const campaignCurrency = await prisma.currency.findFirst({
            where: {
                id: campaign?.currencyId || "",
            },
        });
        const campaignToken = await prisma.token.findFirst({ where: { id: campaignCurrency?.tokenId || "" } });
        const raiinmakerOrg = await prisma.org.findFirst({ where: { name: RAIINMAKER_ORG_NAME } });
        const raiinmakerWallet = await prisma.wallet.findFirst({ where: { orgId: raiinmakerOrg?.id } });
        const raiinmakerCurrency = await prisma.currency.findFirst({
            where: { tokenId: campaignToken?.id, walletId: raiinmakerWallet?.id },
        });
        if (!raiinmakerCurrency) throw new Error("currency not found for raiinmaker");
        if (!campaignCurrency) throw new Error("currency not found for campaign");
        const take = 500;
        let skip = 0;
        const totalParticipants = await prisma.participant.count({ where: { campaignId: campaign.id } });
        const paginatedLoop = Math.ceil(totalParticipants / take);

        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const participants = await prisma.participant.findMany({
                where: { campaignId: campaign.id },
                take,
                skip,
            });
            const promiseArray = [];
            const transferDetails = [];
            for (let index = 0; index < participants.length; index++) {
                const participant = participants[index];
                const userData = await prisma.user.findFirst({
                    where: { id: participant.userId },
                });
                if (!userData) throw new Error("User not found.");
                const userProfile = await prisma.profile.findFirst({ where: { userId: userData?.id } });
                if (!userProfile) throw new Error("User profile not found.");
                const userWallet = await prisma.wallet.findFirst({ where: { userId: userData?.id } });
                if (!userWallet) throw new Error("User wallet not found.");
                const userCurrency = await prisma.currency.findFirst({
                    where: {
                        walletId: userWallet?.id,
                        tokenId: campaignToken?.id,
                    },
                });
                if (!userCurrency) throw new Error("User currency not found.");
                if (!userData) throw new Error("User not found");
                if (userProfile?.deviceToken) userDeviceIds[userData.id] = userProfile?.deviceToken;
                const participantShare = await calculateParticipantPayout(totalRewardAmount, campaign, participant);
                const alreadyTransferred = await prisma.transfer.findFirst({
                    where: {
                        amount: participantShare.toString(),
                        campaignId: campaign.id,
                        walletId: userWallet?.id,
                    },
                });
                if (participantShare.isGreaterThan(0) && !alreadyTransferred) {
                    promiseArray.push(
                        TatumClient.transferFunds({
                            senderAccountId: campaignCurrency.tatumId,
                            recipientAccountId: userCurrency.tatumId,
                            amount: participantShare.toString(),
                            recipientNote: `${CAMPAIGN_REWARD}:${campaign.id}`,
                        })
                    );
                    transferDetails.push({
                        campaignCurrency,
                        userCurrency,
                        campaign,
                        participant,
                        user: userData,
                        amount: participantShare.toString(),
                    });
                    console.log(
                        "TRANSFER PREPARED ---- ",
                        participant.id,
                        participantShare.toString(),
                        campaignCurrency.tatumId,
                        userCurrency.tatumId
                    );
                }
                console.log(
                    "REWARD CALCULATED FRO USER --- ",
                    userData.id,
                    participant.id,
                    participantShare.toString()
                );
            }

            if (!campaign.tatumBlockageId) throw new Error(`No blockage Id found for campaign--- ${campaign.id}`);
            if (pageIndex === 0) await TatumClient.unblockAccountBalance(campaign.tatumBlockageId);

            // transfer campaign fee to raiinmaker tatum account
            if (campaign?.orgId !== raiinmakerOrg?.id) {
                await TatumClient.transferFunds({
                    senderAccountId: campaignCurrency.tatumId,
                    recipientAccountId: raiinmakerCurrency.tatumId,
                    amount: raiinmakerFee?.toString(),
                    recipientNote: `${CAMPAIGN_FEE}:${campaign.id}`,
                });
            }
            const responses = await Promise.allSettled(promiseArray);
            const transferRecords = [];
            for (let index = 0; index < responses.length; index++) {
                const resp = responses[index];
                const transferData = transferDetails[index];
                const wallet = await prisma.wallet.findFirst({ where: { userId: transferData.user.id } });
                if (!wallet) throw new Error("wallet not found for user.");
                transferRecords.push({
                    symbol: campaignToken?.symbol,
                    campaignId: transferData.campaign.id,
                    amount: transferData.amount.toString(),
                    ethAddress: transferData.userCurrency.tatumId,
                    walletId: wallet.id,
                    action: "CAMPAIGN_REWARD",
                    status: resp.status === "fulfilled" ? "SUCCEEDED" : "FAILED",
                });
            }
            await prisma.transfer.createMany({ data: transferRecords });
            skip += take;
        }
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { auditStatus: CampaignAuditStatus.AUDITED },
        });
        return userDeviceIds;
    } catch (error) {
        throw new Error(error.message);
    }
};
