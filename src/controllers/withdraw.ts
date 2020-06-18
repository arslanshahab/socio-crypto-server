import {checkPermissions} from "../middleware/authentication";
import {Transfer} from '../models/Transfer';
import {User} from '../models/User';
import { Wallet } from '../models/Wallet';

export const start = async (args: { withdrawAmount: number }, context: { user: any }) => {
  if (args.withdrawAmount <= 0) throw new Error('withdraw amount must be a positive number');
  const { id } = context.user;
  const user = await User.findOneOrFail({ where: { id } });
  const wallet = await Wallet.findOneOrFail({ where: { user }, relations: ['transfers'] });
  const pendingBalance = await Transfer.getTotalPendingByWallet(wallet);
  if (((wallet.balance - pendingBalance) - args.withdrawAmount) < 0) throw new Error('wallet does not have required balance for this withdraw');
  const transfer = Transfer.newFromWithdraw(wallet, args.withdrawAmount);
  await transfer.save();
  return transfer;
}

export const update = async (args: { withdrawalId: string, status: 'approve'|'reject' }, context: { user: any }) => {
  checkPermissions({ hasRole: ['admin'] }, context);
  const transfer = await Transfer.findOneOrFail({ where: { id: args.withdrawalId }, relations: ['wallet'] });
  if (transfer.action !== 'withdraw' || transfer.withdrawStatus !== 'pending') throw new Error('this method can only be called on pending withdrawals');
  if (args.status === 'approve' && (transfer.wallet.balance - transfer.amount) < 0) {
    transfer.withdrawStatus = 'rejected';
  } else {
    switch (args.status) {
      case 'approve':
        transfer.withdrawStatus = 'approved';
        transfer.wallet.balance -= transfer.amount;
        break;
      case 'reject':
        transfer.withdrawStatus = 'rejected';
        break;
      default:
        throw new Error('status provided is not valid');
    }
  }
  await transfer.save();
  await transfer.wallet.save();
  return transfer;
}

export const getPending = async (_args: any, context: { user: any }) => {
  checkPermissions({ hasRole: ['admin'] }, context);
  return await Transfer.find({ where: { action: 'withdraw', withdrawStatus: 'pending' } });;
}
