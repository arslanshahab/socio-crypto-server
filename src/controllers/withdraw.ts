import {checkPermissions} from "../middleware/authentication";
import {Transfer} from '../models/Transfer';
import {User} from '../models/User';
import { Wallet } from '../models/Wallet';
import { S3Client } from '../clients/s3';
import { SesClient } from '../clients/ses';
import { performTransfer } from './helpers';

export const start = async (args: { withdrawAmount: number }, context: { user: any }) => {
  if (args.withdrawAmount <= 0) throw new Error('withdraw amount must be a positive number');
  const { id } = context.user;
  const user = await User.findOneOrFail({ where: { identityId: id } });
  const wallet = await Wallet.findOneOrFail({ where: { user }, relations: ['transfers'] });
  const pendingBalance = await Transfer.getTotalPendingByWallet(wallet);
  const totalWithdrawThisYear = await Transfer.getTotalAnnualWithdrawalByWallet(wallet);
  // TODO: check if they have W9 on file
  if (((totalWithdrawThisYear + args.withdrawAmount) * 0.1) >= 600 || ((pendingBalance + args.withdrawAmount) * 0.1) >= 600) throw new Error('reached max withdrawals per year');
  if (((wallet.balance.minus(pendingBalance)).minus(args.withdrawAmount)).lt(0)) throw new Error('wallet does not have required balance for this withdraw');
  const transfer = Transfer.newFromWithdraw(wallet, args.withdrawAmount);
  await transfer.save();
  return transfer.asV1();
}

export const update = async (args: { transferIds: string[], status: 'approve'|'reject' }, context: { user: any }) => {
  checkPermissions({ hasRole: ['admin'] }, context);
  if (args.transferIds.length === 0) throw new Error('empty array of transfer IDs provided');
  const transfers: Transfer[] = [];
  const userGroups: {[key: string]: any} = {};
  for (let i = 0; i < args.transferIds.length; i++) {
    const transfer = await Transfer.findOne({ where: { id: args.transferIds[i], action: 'withdraw', withdrawStatus: 'pending' }, relations: ['wallet', 'wallet.user'] });
    if (!transfer) throw new Error(`transfer not found: ${args.transferIds[i]}`);
    if (args.status === 'approve' && (transfer.wallet.balance.minus(transfer.amount)).lt(0)) {
      transfer.withdrawStatus = 'rejected';
    } else {
      switch (args.status) {
        case 'approve':
          const user = transfer.wallet.user;
          transfer.withdrawStatus = 'approved';
          await performTransfer(transfer.wallet.id, transfer.amount.toString(), 'debit');
          if (!userGroups[user.id]) {
            let kycData;
            try { kycData = await S3Client.getUserObject(user.id) } catch (_) { kycData = null; }
            if (kycData) userGroups[user.id] = {totalRedeemedAmount: transfer.amount.toString(), user, paypalEmail: kycData['paypalEmail'], transfers: [transfer] };
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
    transfers.push(transfer);
  }
  await Transfer.save(transfers);
  for (const userId in userGroups) {
    const group = userGroups[userId];
    await SesClient.sendRedemptionConfirmationEmail(userId, group['paypalEmail'], (group['totalRedeemedAmount'] * 0.1).toFixed(2), group['transfers']);
  }
  return transfers.map(transfer => transfer.asV1());
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
      try {
        kycData = await S3Client.getUserObject(userId);
        if (kycData['hasIdProof']) kycData['idProof'] = await S3Client.getKycImage(userId, 'idProof');
        if (kycData['hasAddressProof']) kycData['addressProof'] = await S3Client.getKycImage(userId, 'addressProof');
      } catch (e) { kycData = null; }
      uniqueUsers[userId] = {
        kyc: kycData,
        user: transfer.wallet.user,
        totalPendingWithdrawal: transfer.amount,
        totalAnnualWithdrawn: totalWithdrawnThisYear,
        transfers: [transfer.asV1()]
      }
    } else {
      uniqueUsers[userId].totalPendingWithdrawal += transfer.amount;
      uniqueUsers[userId].transfers.push(transfer.asV1());
    }
  }
  return Object.values(uniqueUsers);
}
