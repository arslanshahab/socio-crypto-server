import { EntityManager } from "typeorm";
import { Campaign } from "../../models/Campaign";
import { Participant } from "../../models/Participant";
import { calculateParticipantPayout, calculateRaffleWinner, performCurrencyTransfer } from "../../controllers/helpers";
import { Wallet } from "../../models/Wallet";
import { RafflePrize } from "../../models/RafflePrize";
import { Transfer } from "../../models/Transfer";
import { SesClient } from "../../clients/ses";
// import { Dragonchain } from "../../clients/dragonchain";
import { decrypt } from "../../util/crypto";
import { getCurrentCampaignTier } from "../../controllers/campaign";
import { BN } from "../../util";
import { BigNumber } from "bignumber.js";
import { FEE_RATE, RAIINMAKER_ORG_NAME } from "../../util/constants";
import { Currency } from "../../models/Currency";
import { Org } from "../../models/Org";
import { User } from "../../models/User";
import { TatumClient, CAMPAIGN_REWARD, CAMPAIGN_FEE } from "../../clients/tatumClient";
import { Escrow } from "../../models/Escrow";
import { getParticipant } from "../../controllers/participant";
import { In } from "typeorm";

export const payoutRaffleCampaignRewards = async (
    entityManager: EntityManager,
    campaign: Campaign,
    rejected: string[]
) => {
    if (!campaign.prize) throw new Error("no campaign prize");
    if (campaign.participants.length === 0) throw new Error("no participants on campaign for audit");
    let totalParticipationScore = new BN(0).plus(campaign.totalParticipationScore);
    const clonedParticipants =
        rejected.length > 0
            ? campaign.participants.reduce((accum: Participant[], current: Participant) => {
                  if (rejected.indexOf(current.id) > -1)
                      totalParticipationScore = totalParticipationScore.minus(current.participationScore);
                  else accum.push(current);
                  return accum;
              }, [])
            : campaign.participants;
    const winner = calculateRaffleWinner(totalParticipationScore, clonedParticipants);
    const wallet = await Wallet.findOneOrFail({ where: { user: winner.user } });
    const prize = await RafflePrize.findOneOrFail({
        where: { id: campaign.prize.id },
    });
    const transfer = Transfer.newFromRaffleSelection(wallet, campaign, prize);
    campaign.auditStatus = "AUDITED";
    await entityManager.save([campaign, wallet, transfer]);
    await SesClient.sendRafflePrizeRedemptionEmail(winner.user.id, decrypt(winner.email), campaign);
    // await Dragonchain.ledgerRaffleCampaignAudit({ [winner.user.id]: campaign.prize.displayName }, [], campaign.id);
    return { [winner.user.id]: winner.user.profile.deviceToken };
};

export const payoutCryptoCampaignRewards = async (campaign: Campaign) => {
    try {
        const usersRewards: { [key: string]: BigNumber } = {};
        const userDeviceIds: { [key: string]: string } = {};
        const { currentTotal } = await getCurrentCampaignTier(null, { campaign });
        let totalRewardAmount = new BN(currentTotal);
        const participants = await Participant.find({
            where: { campaign },
            relations: ["user"],
        });
        let raiinmakerFee = new BN(0);
        const campaignFee = totalRewardAmount.multipliedBy(FEE_RATE);
        raiinmakerFee = raiinmakerFee.plus(campaignFee);
        totalRewardAmount = totalRewardAmount.minus(campaignFee);
        const raiinmakerAccount = await Currency.findOne({
            where: {
                wallet: await Wallet.findOne({
                    where: { org: await Org.findOne({ where: { name: RAIINMAKER_ORG_NAME } }) },
                }),
                symbol: campaign.symbol,
            },
            relations: ["token"],
        });
        if (!raiinmakerAccount) throw new Error("currency not found for raiinmaker");
        const campaignAccount = campaign.currency;
        if (!campaignAccount) throw new Error("currency not found for campaign");
        for (let index = 0; index < participants.length; index++) {
            const participant = participants[index];
            const userData = await User.findOne({
                where: { id: participant.user.id },
                relations: ["profile"],
            });
            if (!userData) throw new Error("User not found");
            userDeviceIds[userData.id] = userData.profile.deviceToken;
            const participantShare = await calculateParticipantPayout(totalRewardAmount, campaign, participant);
            if (participantShare.isGreaterThan(0)) {
                usersRewards[userData.id] = participantShare;
            }
        }

        if (!campaign.tatumBlockageId) throw new Error(`No blockage Id found for campaign--- ${campaign.id}`);
        await TatumClient.unblockAccountBalance(campaign.tatumBlockageId);

        const promiseArray = [];
        const transferDetails = [];
        for (let index = 0; index < participants.length; index++) {
            const participant = participants[index];
            const userCurrency = await Currency.findOne({
                where: { wallet: await Wallet.findOne({ where: { user: participant.user } }), symbol: campaign.symbol },
            });
            if (!userCurrency) throw new Error(`currency not found for user ${participant.user.id}`);
            promiseArray.push(
                TatumClient.transferFunds({
                    senderAccountId: campaignAccount.tatumId,
                    recipientAccountId: userCurrency.tatumId,
                    amount: usersRewards[participant.user.id].toString(),
                    recipientNote: `${CAMPAIGN_REWARD}:${campaign.id}`,
                })
            );
            transferDetails.push({
                campaignAccount,
                userCurrency,
                campaign,
                participant,
                amount: usersRewards[participant.user.id],
            });
            console.log(
                "TRANSFER PREPARED ---- ",
                participant.id,
                usersRewards[participant.user.id].toString(),
                campaignAccount.tatumId,
                userCurrency.tatumId
            );
        }

        // transfer campaign fee to raiinmaker tatum account
        if (campaign.org.name !== RAIINMAKER_ORG_NAME) {
            await TatumClient.transferFunds({
                senderAccountId: campaignAccount.tatumId,
                recipientAccountId: raiinmakerAccount.tatumId,
                amount: raiinmakerFee.toString(),
                recipientNote: `${CAMPAIGN_FEE}:${campaign.id}`,
            });
        }
        const responses = await Promise.allSettled(promiseArray);
        const transferRecords = [];
        for (let index = 0; index < responses.length; index++) {
            const resp = responses[index];
            if (resp.status === "fulfilled") {
                const transferData = transferDetails[index];
                const wallet = await Wallet.findOne({ where: { user: transferData.participant.user } });
                if (!wallet) throw new Error("wallet not found for user.");
                const newTransfer = Transfer.initTatumTransfer({
                    symbol: transferData.campaign.symbol,
                    network: "",
                    campaign: transferData.campaign,
                    amount: transferData.amount,
                    tatumId: transferData.userCurrency.tatumId,
                    wallet,
                    action: "CAMPAIGN_REWARD",
                });
                transferRecords.push(newTransfer);
            }
        }
        await Transfer.save(transferRecords);
        campaign.auditStatus = "AUDITED";
        await campaign.save();
        return userDeviceIds;
    } catch (error) {
        throw new Error(error.message);
    }
};

export const payoutCoiinCampaignRewards = async (
    entityManager: EntityManager,
    campaign: Campaign,
    rejected: string[]
) => {
    const usersWalletValues: { [key: string]: BigNumber } = {};
    const userDeviceIds: { [key: string]: string } = {};
    const transfers: Transfer[] = [];
    const { currentTotal } = await getCurrentCampaignTier(null, { campaign });
    const bigNumTotal = new BN(currentTotal);
    const participants = await Participant.find({
        where: { campaign },
        relations: ["user"],
    });
    let escrow = await Escrow.findOne({
        where: { campaign },
        relations: ["wallet"],
    });
    if (!escrow) throw new Error("escrow not found");
    let totalFee = new BN(0);
    let totalPayout = new BN(0);
    const users =
        participants.length > 0
            ? await User.find({
                  where: { id: In(participants.map((p) => p.user.id)) },
                  relations: ["wallet"],
              })
            : [];
    const wallets =
        users.length > 0
            ? await Wallet.find({
                  where: { id: In(users.map((u) => u.wallet.id)) },
                  relations: ["user"],
              })
            : [];
    if (rejected.length > 0) {
        const newParticipationCount = participants.length - rejected.length;
        let totalRejectedPayout = new BN(0);
        for (const id of rejected) {
            const participant = await getParticipant(null, { id });
            const totalParticipantPayout = await calculateParticipantPayout(bigNumTotal, campaign, participant);
            totalRejectedPayout = totalRejectedPayout.plus(totalParticipantPayout);
        }
        const addedPayoutToEachParticipant = totalRejectedPayout.div(new BN(newParticipationCount));
        for (const participant of participants) {
            if (!rejected.includes(participant.id)) {
                const subtotal = await calculateParticipantPayout(bigNumTotal, campaign, participant);
                const totalParticipantPayout = subtotal.plus(addedPayoutToEachParticipant);
                if (participant.user.profile.deviceToken)
                    userDeviceIds[participant.user.id] = participant.user.profile.deviceToken;
                if (!usersWalletValues[participant.user.id])
                    usersWalletValues[participant.user.id] = totalParticipantPayout;
                else
                    usersWalletValues[participant.user.id] =
                        usersWalletValues[participant.user.id].plus(totalParticipantPayout);
            }
        }
    } else {
        for (const participant of participants) {
            const totalParticipantPayout = await calculateParticipantPayout(bigNumTotal, campaign, participant);
            if (participant.user.profile.deviceToken)
                userDeviceIds[participant.user.id] = participant.user.profile.deviceToken;
            if (!usersWalletValues[participant.user.id])
                usersWalletValues[participant.user.id] = totalParticipantPayout;
            else
                usersWalletValues[participant.user.id] =
                    usersWalletValues[participant.user.id].plus(totalParticipantPayout);
        }
    }
    for (const userId in usersWalletValues) {
        const currentWallet = wallets.find((w) => w.user.id === userId);
        if (currentWallet) {
            const allottedPayment = usersWalletValues[userId];
            if (new BN(allottedPayment).isGreaterThan(0)) {
                const fee = new BN(allottedPayment).times(FEE_RATE);
                const payout = new BN(allottedPayment).minus(fee);
                totalFee = totalFee.plus(fee);
                totalPayout = totalPayout.plus(allottedPayment);
                await performCurrencyTransfer(
                    escrow.id,
                    currentWallet.id,
                    campaign.crypto.type,
                    payout.toString(),
                    true
                );
                const transfer = Transfer.newFromCampaignPayout(currentWallet, campaign, payout);
                transfers.push(transfer);
            }
        }
    }
    if (new BN(totalFee).isGreaterThan(0)) await Transfer.transferCampaignPayoutFee(campaign, totalFee);
    const payoutTransfer = Transfer.newFromWalletPayout(escrow.wallet, campaign, totalPayout);
    transfers.push(payoutTransfer);
    escrow = await Escrow.findOneOrFail({
        where: { campaign },
        relations: ["wallet"],
    });
    if (escrow.amount.gt(0)) {
        await performCurrencyTransfer(
            escrow.id,
            escrow.wallet.id,
            campaign.crypto.type,
            escrow.amount.toString(),
            true
        );
        const transfer = Transfer.newFromCampaignPayoutRefund(escrow.wallet, campaign, escrow.amount);
        await transfer.save();
        await escrow.remove();
    } else {
        await escrow.remove();
    }
    campaign.auditStatus = "AUDITED";
    await entityManager.save(campaign);
    await entityManager.save(participants);
    await entityManager.save(transfers);

    // await Dragonchain.ledgerCoiinCampaignAudit(usersWalletValues, rejected, campaign.id);
    return userDeviceIds;
};
