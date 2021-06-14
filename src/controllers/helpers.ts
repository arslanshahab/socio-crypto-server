import { SocialPost } from "../models/SocialPost";
import { Tiers, AggregateDailyMetrics } from "../types";
import { Participant } from "../models/Participant";
import { Campaign } from "../models/Campaign";
import { getConnection } from "typeorm";
import { Wallet } from "../models/Wallet";
import { BN, generateRandomNumber } from "../util/helpers";
import { BigNumber } from "bignumber.js";
import { DailyParticipantMetric } from "../models/DailyParticipantMetric";
import { Org } from "../models/Org";
import { Escrow } from "../models/Escrow";
import { WalletCurrency } from "../models/WalletCurrency";

export const FEE_RATE = process.env.FEE_RATE ? parseFloat(process.env.FEE_RATE) : 0.1;
export const feeMultiplier = new BN(1).minus(FEE_RATE);

export const updateOrgCampaignsStatusOnDeposit = async (wallet: Wallet) => {
    const org = await Org.listOrgCampaignsByWalletIdAndStatus(wallet.id, "INSUFFICIENT_FUNDS");
    if (!org) return;
    const now = new Date();
    const escrows: Escrow[] = [];
    const campaigns: Campaign[] = [];
    let totalCost = new BN(0);
    for (const campaign of org.campaigns) {
        totalCost = totalCost.plus(campaign.coiinTotal);
        const walletCurrency = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, org.wallet);
        if (walletCurrency.balance.gte(totalCost)) {
            campaign.status = campaign.beginDate <= now ? "ACTIVE" : "APPROVED";
            escrows.push(Escrow.newCampaignEscrow(campaign, org.wallet));
            campaigns.push(campaign);
            await performCurrencyAction(wallet.id, campaign.crypto.type, totalCost.toString(), "debit");
        }
    }
    await Campaign.save(campaigns);
    await Escrow.save(escrows);
    return true;
};

export const shuffle = (a: any[]) => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

export const calculateRaffleWinner = (
    totalParticipationScore: BigNumber,
    participants: Participant[],
    currentRun = 1
): Participant => {
    if (participants.length === 0) throw new Error("no participants found");
    if (participants.length === 1) return participants[0];
    if (currentRun > 5) throw new Error("no winner found in 5 runs. Try again");
    const sumOfWeights = totalParticipationScore;
    let rand = generateRandomNumber(sumOfWeights.toNumber());
    const numberOfChoices = participants.length;
    const shuffledParticipants = shuffle(participants);
    for (let i = 0; i < numberOfChoices; i++) {
        const participant = shuffledParticipants[i];
        if (rand < participant.participationScore.toNumber()) {
            return participant;
        }
        rand -= participant.participationScore.toNumber();
    }
    return calculateRaffleWinner(totalParticipationScore, shuffledParticipants, currentRun + 1);
};

export const calculateParticipantSocialScore = async (participant: Participant, campaign: Campaign) => {
    const socialPosts = await SocialPost.find({
        where: { participantId: participant.id },
    });
    let totalLikes = new BN(0);
    let totalShares = new BN(0);
    socialPosts.forEach((post) => {
        totalLikes = totalLikes.plus(post.likes);
        totalShares = totalShares.plus(post.shares);
    });
    return {
        totalLikes,
        totalShares,
        likesScore: totalLikes.multipliedBy(campaign.algorithm.pointValues.likes),
        shareScore: totalShares.multipliedBy(campaign.algorithm.pointValues.shares),
    };
};

export const calculateTier = (totalParticipation: BigNumber, tiers: Tiers) => {
    let currentTier = 1;
    let currentTotal = new BN(1);
    const numOfTiers = Object.keys(tiers).reduce((accum: number, value: any) => {
        if ((tiers[value].threshold as any) !== "" && (tiers[value].totalCoiins as any) !== "") {
            accum++;
        }
        return accum;
    }, 0);
    if (totalParticipation.isGreaterThan(tiers[numOfTiers].threshold)) {
        currentTier = numOfTiers;
        currentTotal = tiers[numOfTiers].totalCoiins;
        return { currentTotal, currentTier };
    }
    for (let key in tiers) {
        if (totalParticipation.isLessThan(tiers[key].threshold) || !tiers[key].threshold) {
            if (Number(key) < 2) {
                currentTier = 1;
                currentTotal = tiers["1"].totalCoiins;
                return { currentTier, currentTotal };
            } else {
                const previousTier = Number(key) - 1;
                currentTier = previousTier;
                currentTotal = tiers[String(previousTier)].totalCoiins;
                return { currentTier, currentTotal };
            }
        }
    }

    return { currentTier, currentTotal };
};

export const calculateParticipantPayout = async (
    currentCampaignTierTotal: BigNumber,
    campaign: Campaign,
    participant: Participant
) => {
    if (campaign.totalParticipationScore.eq(new BN(0))) return new BN(0);
    const percentageOfTotalParticipation = new BN(participant.participationScore).div(campaign.totalParticipationScore);
    return currentCampaignTierTotal.multipliedBy(percentageOfTotalParticipation);
};

export const calculateParticipantPayoutFromDailyParticipation = (
    currentCampaignTierTotal: BigNumber,
    campaign: Campaign,
    metrics: AggregateDailyMetrics
) => {
    if (campaign.totalParticipationScore.eq(new BN(0))) return new BN(0);
    const viewScore = campaign.algorithm.pointValues.views.times(metrics.viewCount);
    const clickScore = campaign.algorithm.pointValues.clicks.times(metrics.clickCount);
    const submissionScore = campaign.algorithm.pointValues.submissions.times(metrics.submissionCount);
    const likesScore = campaign.algorithm.pointValues.likes.times(metrics.likeCount);
    const sharesScore = campaign.algorithm.pointValues.shares.times(metrics.shareCount);
    const totalParticipantPoints = viewScore.plus(clickScore).plus(submissionScore).plus(likesScore).plus(sharesScore);
    const percentageOfTotalParticipation = totalParticipantPoints.div(campaign.totalParticipationScore);
    return currentCampaignTierTotal.multipliedBy(percentageOfTotalParticipation);
};

export const performCurrencyTransfer = async (
    fromId: string,
    toId: string,
    currencyType: string,
    amount: string,
    isEscrow: boolean = false
) => {
    if (new BN(amount).lte(0)) throw new Error("Amount must be a positive number");
    return getConnection().transaction(async (transactionalEntityManager) => {
        let from, to;
        if (isEscrow) {
            from = await transactionalEntityManager.findOne(Escrow, {
                where: { id: fromId },
            });
            if (!from) throw new Error("escrow not found");
            from.amount = from.amount.minus(amount);
        } else {
            from = await transactionalEntityManager.findOne(WalletCurrency, {
                where: { type: currencyType, wallet: { id: fromId } },
                relations: ["wallet"],
            });
            if (!from) throw Error("from wallet currency not found");
            if (from.balance.minus(amount).lt(0))
                throw new Error("wallet does not have the necessary funds to complete this action");
            from.balance = from.balance.minus(amount);
        }
        to = await transactionalEntityManager.findOne(WalletCurrency, {
            where: { type: currencyType, wallet: { id: toId } },
            relations: ["wallet"],
        });
        if (!to) {
            const toWallet = await transactionalEntityManager.findOne(Wallet, {
                where: { id: toId },
            });
            const newCurrency = WalletCurrency.newWalletCurrency(currencyType, toWallet);
            await newCurrency.save();
            to = await transactionalEntityManager.findOneOrFail(WalletCurrency, {
                where: { type: currencyType, wallet: toWallet },
            });
        }
        to.balance = to.balance.plus(amount);
        await transactionalEntityManager.save([from, to]);
    });
};

export const performCurrencyAction = async (
    walletId: string,
    currencyType: string,
    amount: string,
    action: "credit" | "debit"
) => {
    if (new BN(amount).lte(0)) throw new Error("Amount must be a positive number");
    return getConnection().transaction(async (transactionalEntityManager) => {
        const wallet = await transactionalEntityManager.findOne(Wallet, {
            where: { id: walletId },
        });
        if (!wallet) throw new Error("wallet not found");
        let walletCurrency = await transactionalEntityManager.findOne(WalletCurrency, {
            where: { type: currencyType, wallet },
        });
        switch (action) {
            case "credit":
                if (!walletCurrency) {
                    const newCurrency = WalletCurrency.newWalletCurrency(currencyType, wallet);
                    await newCurrency.save();
                    walletCurrency = await transactionalEntityManager.findOneOrFail(WalletCurrency, {
                        where: { type: currencyType, wallet },
                    });
                }
                walletCurrency.balance = walletCurrency.balance.plus(amount);
                break;
            case "debit":
                if (!walletCurrency) throw new Error("wallet currency not found");
                walletCurrency.balance = walletCurrency.balance.minus(amount);
                if (walletCurrency.balance.lt(0))
                    throw new Error("wallet does not have the necessary funds to complete this action");
                break;
            default:
                throw new Error(`transfer method ${action} not provided`);
        }
        console.log("NEW WALLET BALANCE", walletCurrency.type, walletCurrency.id, walletCurrency.balance.toString());
        await transactionalEntityManager.save(walletCurrency);
    });
};

const addDays = (date: Date, days: number): Date => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + 1);
    return d;
};

export const getDatesBetweenDates = (date1: Date, date2: Date) => {
    const dateArray = [];
    let currentDate = new Date(date1);
    while (currentDate <= new Date(date2)) {
        dateArray.push(new Date(currentDate).toUTCString());
        currentDate = addDays(currentDate, 1);
    }
    if (dateArray.length > 0) dateArray.splice(0, 1);
    return dateArray;
};

export const wait = async (delayInMs: number, func: any) => {
    setTimeout(async () => {
        await func();
    }, delayInMs);
};

export const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const groupDailyMetricsByUser = async (userId: string, metrics: DailyParticipantMetric[]) => {
    const alreadyHandledParticipants: { [key: string]: any } = {};
    const modifiedMetrics = metrics.reduce((accum: { [key: string]: any }, current: DailyParticipantMetric) => {
        if (!alreadyHandledParticipants[current.participantId]) {
            if (!accum[current.campaign.id])
                accum[current.campaign.id] = {
                    totalParticipation: current.totalParticipationScore.toString(),
                    campaign: current.campaign,
                    metrics: [current],
                    participationScore: current.user.id === userId && current.participationScore.toString(),
                };
            else {
                accum[current.campaign.id].totalParticipation = new BN(accum[current.campaign.id].totalParticipation)
                    .plus(current.totalParticipationScore)
                    .toString();
                accum[current.campaign.id].metrics.push(current);
                if (current.user.id === userId)
                    accum[current.campaign.id].participationScore = current.participationScore.toString();
            }
            alreadyHandledParticipants[current.participantId] = 1;
        }
        return accum;
    }, {});
    for (let i = 0; i < Object.keys(modifiedMetrics).length; i++) {
        const campaignId = Object.keys(modifiedMetrics)[i];
        const tierInformation = calculateTier(
            new BN(modifiedMetrics[campaignId].totalParticipation),
            modifiedMetrics[campaignId].campaign.algorithm.tiers
        );
        const myParticipation = modifiedMetrics[campaignId].metrics.find(
            (metric: DailyParticipantMetric) => metric.user.id === userId
        );
        modifiedMetrics[campaignId]["rank"] = getRank(userId, modifiedMetrics[campaignId].metrics);
        modifiedMetrics[campaignId]["tier"] = tierInformation["currentTier"];
        modifiedMetrics[campaignId]["prospectivePayout"] = myParticipation
            ? await calculateParticipantPayoutFromDailyParticipation(
                  new BN(tierInformation.currentTier),
                  modifiedMetrics[campaignId].campaign,
                  await DailyParticipantMetric.getAggregatedMetrics(myParticipation.participantId)
              ).toString()
            : "0";
    }
    return modifiedMetrics;
};

export const getRank = (userId: string, metrics: DailyParticipantMetric[]) => {
    let rank = -1;
    const sortedMetrics = metrics.sort((a: DailyParticipantMetric, b: DailyParticipantMetric) =>
        parseFloat(new BN(b.totalParticipationScore).minus(a.totalParticipationScore).toString())
    );

    const userIndex = sortedMetrics.findIndex((metric) => metric.user.id === userId);
    if (!parseInt(sortedMetrics[userIndex].totalParticipationScore.toString())) {
        rank = sortedMetrics.length;
    } else {
        rank = userIndex + 1;
    }

    return rank;
};

export const extractVideoData = (video: string): any[] => {
    const mimeType = video.split(":")[1].split(";")[0];
    const image = video.split(",")[1];
    const bytes = Buffer.from(image, "base64");
    return [mimeType, image, bytes.length];
};

export const chunkVideo = (video: string, chunkSize: number = 5000000): string[] => {
    const chunks = [];
    let currentChunk = "";
    for (let i = 0; i < video.length; i++) {
        currentChunk += video[i];
        if (currentChunk.length === chunkSize || i === video.length - 1) {
            chunks.push(currentChunk);
            currentChunk = "";
        }
    }
    return chunks;
};

export const formatUTCDateForComparision = (date: Date): string => {
    const currentDate = new Date(date);
    const month =
        currentDate.getUTCMonth() + 1 < 10 ? `0${currentDate.getUTCMonth() + 1}` : currentDate.getUTCMonth() + 1;
    const day = currentDate.getUTCDate() < 10 ? `0${currentDate.getUTCDate()}` : currentDate.getUTCDate();
    return `${currentDate.getUTCFullYear()}-${month}-${day}`;
};

export const getYesterdaysDate = (date: Date) => {
    const yesterdayDate = new Date(date);
    yesterdayDate.setUTCDate(new Date().getUTCDate() - 1);
    yesterdayDate.setUTCHours(0);
    yesterdayDate.setUTCMinutes(0);
    yesterdayDate.setUTCSeconds(0);
    yesterdayDate.setUTCMilliseconds(0);
    return yesterdayDate;
};
