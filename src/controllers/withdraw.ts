import {checkPermissions} from "../middleware/authentication";
import {Transfer} from '../models/Transfer';
import {User} from '../models/User';
import { Wallet } from '../models/Wallet';
import { In } from 'typeorm';
import { S3Client } from '../clients/s3';
import { SesClient } from '../clients/ses';

export const start = async (args: { withdrawAmount: number }, context: { user: any }) => {
  if (args.withdrawAmount <= 0) throw new Error('withdraw amount must be a positive number');
  const { id } = context.user;
  const user = await User.findOneOrFail({ where: { identityId: id } });
  const wallet = await Wallet.findOneOrFail({ where: { user }, relations: ['transfers'] });
  const pendingBalance = await Transfer.getTotalPendingByWallet(wallet);
  const totalWithdrawThisYear = await Transfer.getTotalAnnualWithdrawalByWallet(wallet);
  // TODO: check if they have W9 on file
  if (((totalWithdrawThisYear + args.withdrawAmount) * 0.1) >= 600 || ((pendingBalance + args.withdrawAmount) * 0.1) >= 600) throw new Error('reached max withdrawals per year');
  if (((wallet.balance - pendingBalance) - args.withdrawAmount) < 0) throw new Error('wallet does not have required balance for this withdraw');
  const transfer = Transfer.newFromWithdraw(wallet, args.withdrawAmount);
  await transfer.save();
  return transfer;
}

export const update = async (args: { transferIds: string[], status: 'approve'|'reject' }, context: { user: any }) => {
  checkPermissions({ hasRole: ['admin'] }, context);
  if (args.transferIds.length === 0) throw new Error('empty array of transfer IDs provided');
  const transfers = await Transfer.find({ where: { id: In(args.transferIds), action: 'withdraw', withdrawStatus: 'pending' }, relations: ['wallet', 'wallet.user'] });
  const transfersToSave: Transfer[] = [];
  const walletsToSave: Wallet[] = [];
  const userGroups: {[key: string]: any} = {};
  for (let i = 0; i < transfers.length; i++) {
    const transfer = transfers[i];
    if (args.status === 'approve' && (transfer.wallet.balance - transfer.amount) < 0) {
      transfer.withdrawStatus = 'rejected';
    } else {
      switch (args.status) {
        case 'approve':
          const user = transfer.wallet.user;
          transfer.withdrawStatus = 'approved';
          transfer.wallet.balance -= transfer.amount;
          if (!userGroups[user.id]) {
            let kycData;
            try { kycData = await S3Client.getUserObject(user.id) } catch (_) { kycData = null; }
            if (kycData) userGroups[user.id] = {totalRedeemedAmount: transfer.amount, user, paypalEmail: kycData['email'], transfers: [transfer] }; // TODO: change back to ['paypalEmail']
          } else {
            userGroups[user.id].totalRedeemedAmount += transfer.amount;
            userGroups[user.id].transfers.push(transfer);
          }
          break;
        case 'reject':
          transfer.withdrawStatus = 'rejected';
          break;
        default:
          throw new Error('status provided is not valid');
      }
    }
    transfersToSave.push(transfer);
    walletsToSave.push(transfer.wallet);
  }
  await Transfer.save(transfersToSave);
  await Wallet.save(walletsToSave);
  for (const userId in userGroups) {
    const group = userGroups[userId];
    await SesClient.sendRedemptionConfirmationEmail(userId, group['paypalEmail'], (group['totalRedeemedAmount'] * 0.1).toFixed(2), group['transfers']);
  }
  return transfers;
}

export const getWithdrawals = async (args: { status: string }, context: { user: any }) => {
  checkPermissions({ hasRole: ['admin'] }, context);
  const transfers = await Transfer.getWithdrawalsByStatus(args.status);
  const uniqueUsers: {[key: string]: any} = {};
  for (let i = 0; i < transfers.length; i++) {
    const transfer = transfers[i];
    const userId = transfer.wallet.user.id;
    if (!uniqueUsers[userId]) {
      const totalWithdrawnThisYear = await Transfer.getTotalAnnualWithdrawalByWallet(transfer.wallet);
      let kycData: any;
      try { kycData = await S3Client.getUserObject(userId); } catch (e) { kycData = null; }
      uniqueUsers[userId] = {
        kyc: kycData,
        user: transfer.wallet.user,
        totalPendingWithdrawal: transfer.amount,
        totalAnnualWithdrawn: totalWithdrawnThisYear,
        transfers: [transfer]
      }
    } else {
      uniqueUsers[userId].totalPendingWithdrawal += transfer.amount;
      uniqueUsers[userId].transfers.push(transfer);
    }
  }
  return Object.values(uniqueUsers);
}
