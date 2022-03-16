import { RAIINMAKER_WITHDRAW, TatumClient, USER_WITHDRAW } from "../clients/tatumClient";
import { Admin } from "../models/Admin";
import { Request, Response } from "express";
import { TatumWallet } from "../models/TatumWallet";
import { User } from "../models/User";
import { S3Client } from "../clients/s3";
import { asyncHandler, BN } from "../util";
import { Currency } from "../models/Currency";
import { Transfer } from "../models/Transfer";
import { ApolloError } from "apollo-server-express";
import { CustodialAddress } from "../models/CustodialAddress";
import { Wallet } from "../models/Wallet";
import { Org } from "../models/Org";
import { RAIINMAKER_ORG_NAME } from "../util/constants";
// import { Verification } from "../models/Verification";

export const initWallet = asyncHandler(async (req: Request, res: Response) => {
    try {
        let { currency, network } = req.body;
        if (!currency || !network) throw new Error("Missing required parameters");
        if (await TatumClient.ifWalletExists({ symbol: currency, network }))
            throw new Error(`Wallet already exists for currency: ${currency}`);
        const wallet: any = await TatumClient.createWallet(currency);
        await S3Client.setTatumWalletKeys(currency, {
            ...wallet,
        });
        await TatumWallet.addTatumWallet({
            xpub: wallet.xpub || "",
            address: wallet.address || "",
            currency,
        });
        res.status(200).json(wallet);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

export const saveWallet = asyncHandler(async (req: Request, res: Response) => {
    try {
        let { mnemonic, secret, privateKey, xpub, address, currency, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        currency = currency.toUpperCase();
        if (await TatumClient.ifWalletExists(currency))
            throw new Error(`Wallet already exists for currency: ${currency}`);
        const wallet = await TatumWallet.addTatumWallet({ xpub, address, currency });
        await S3Client.setTatumWalletKeys(currency, {
            mnemonic,
            secret,
            privateKey,
            address,
            xpub,
        });
        res.status(200).json(wallet);
    } catch (error) {
        res.status(403).json(error.message);
    }
});

// export const generateCustodialAddresses = asyncHandler(async (req: Request, res: Response) => {
//     try {
//         let { currency, token } = req.body;
//         currency = currency.toUpperCase();
//         if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
//         if (!TatumClient.isCurrencySupported(currency)) throw new Error(`Currency ${currency} is not supported`);
//         const list = await TatumClient.generateCustodialAddresses(currency);
//         await CustodialAddress.saveAddresses(list, TatumClient.getBaseChain(currency) as CustodialAddressChain);
//         res.status(200).json(list);
//     } catch (error) {
//         res.status(403).json(error.message);
//     }
// });

export const getAccountTransactions = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { accountId, token, pageSize, offset } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const transactions = await TatumClient.getAccountTransactions(
            {
                id: accountId,
                // transactionType: TransactionType.CREDIT_DEPOSIT,
            },
            pageSize,
            offset
        );
        res.status(200).json(transactions);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const getAccountBalance = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { accountId, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const balance = await TatumClient.getAccountBalance(accountId);
        res.status(200).json(balance);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const createTatumAccount = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { userId, symbol, network, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        if (!userId || !symbol || !network) throw new Error("Missing required parameters");
        const user = await User.findOne({ where: { id: userId }, relations: ["wallet"] });
        if (!user) throw new Error("User not found.");
        const tatumCurrency = await TatumClient.findOrCreateCurrency({ symbol, network, wallet: user.wallet });
        res.status(200).json(tatumCurrency);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const listBlockedAmounts = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { accountId, token, pageSize = 50, offset = 0 } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const list = await TatumClient.getBlockedBalanceForAccount(accountId, pageSize, offset);
        res.status(200).json(list);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const unblockAccountBalance = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        await TatumClient.unblockAccountBalance(id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const blockAccountBalance = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id, amount, blockageKey, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const blockedAmount = await TatumClient.blockAccountBalance(id, amount, blockageKey);
        res.status(200).json(blockedAmount);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const getAllWithdrawls = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { currency, status, pageSize, offset, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const list = await TatumClient.listWithdrawls(status, currency, pageSize, offset);
        res.status(200).json(list);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const transferBalance = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { toAccount, fromAccount, amount, note, token } = req.body;
        if (!token || token !== process.env.RAIINMAKER_DEV_TOKEN) throw new Error("Invalid Token");
        const data = await TatumClient.transferFunds({
            senderAccountId: fromAccount,
            recipientAccountId: toAccount,
            amount: amount,
            recipientNote: note,
        });
        res.status(200).json(data);
    } catch (error) {
        res.status(200).json(error.message);
    }
});

export const getSupportedCurrencies = async (parent: any, args: any, context: { user: any }) => {
    try {
        const { id } = context.user;
        const admin = await Admin.findOne({ where: { firebaseId: id } });
        if (!admin) throw new Error("Admin not found!");
        return await TatumClient.getAllCurrencies();
    } catch (error) {
        throw new ApolloError(error.message);
    }
};

export const getDepositAddress = async (
    parent: any,
    args: { symbol: string; network: string },
    context: { user: any }
) => {
    try {
        const { id } = context.user;
        if (!args.symbol || !args.network) throw new Error("Missing required params.");
        const admin = await Admin.findOne({ where: { firebaseId: id }, relations: ["org", "org.wallet"] });
        if (!admin) throw new Error("Admin not found!");
        const token = await TatumClient.isCurrencySupported(args);
        if (!token) throw new Error("Currency not supported");
        const ledgerAccount = await TatumClient.findOrCreateCurrency({ ...args, wallet: admin.org.wallet });
        if (!ledgerAccount) throw new Error("Ledger account not found.");
        return {
            symbol: token.symbol,
            address: ledgerAccount.depositAddress,
            fromTatum: true,
            destinationTag: ledgerAccount.destinationTag,
            memo: ledgerAccount.memo,
            message: ledgerAccount.message,
        };
    } catch (error) {
        throw new ApolloError(error.message);
    }
};

export const withdrawFunds = async (
    parent: any,
    args: { symbol: string; network: string; address: string; amount: number; verificationToken: string },
    context: { user: any }
) => {
    try {
        const user = await User.findUserByContext(context.user, ["wallet"]);
        if (!user) throw new Error("User not found");
        if (user.kycStatus !== "APPROVED")
            throw new Error("You need to get your KYC approved before you can withdraw.");
        let { symbol, network, address, amount } = args;
        const token = await TatumClient.isCurrencySupported({ symbol, network });
        if (!token) throw new Error(`Currency ${symbol} on ${network} network is not supported`);
        // await Verification.verifyToken({ verificationToken });
        const userCurrency = await Currency.findOne({ where: { wallet: user.wallet, token }, relations: ["token"] });
        if (!userCurrency) throw new Error(`User wallet not found for currency ${symbol}`);
        const userAccountBalance = await TatumClient.getAccountBalance(userCurrency.tatumId);
        if (parseFloat(userAccountBalance.availableBalance) < amount)
            throw new Error("Not enough balance in user account to perform this withdraw.");
        const custodialAddress = await CustodialAddress.findOne({
            where: {
                chain: token.network,
                wallet: await Wallet.findOne({
                    where: { org: await Org.findOne({ where: { name: RAIINMAKER_ORG_NAME } }) },
                }),
            },
        });
        if (TatumClient.isCustodialWallet({ symbol, network }) && !custodialAddress)
            throw new Error("No custodial address available for raiinmaker");
        const withdrawResp = await TatumClient.withdrawFundsToBlockchain({
            senderAccountId: userCurrency.tatumId,
            paymentId: `${USER_WITHDRAW}:${user.id}`,
            senderNote: RAIINMAKER_WITHDRAW,
            address,
            amount: amount.toString(),
            currency: userCurrency,
            custodialAddress,
        });
        const newTransfer = Transfer.initTatumTransfer({
            txId: withdrawResp?.txId,
            symbol: token.symbol,
            network: token.network,
            amount: new BN(amount),
            action: "WITHDRAW",
            wallet: user.wallet,
            tatumId: address,
        });
        newTransfer.save();
        return {
            success: true,
            message: "Withdraw completed successfully",
        };
    } catch (error) {
        throw new ApolloError(error.message);
    }
};
