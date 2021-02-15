import {checkPermissions} from "../middleware/authentication";
import {Org} from "../models/Org";
import {FailureByDesign} from "../util/errors";
import {CryptoCurrency} from "../models/CryptoCurrency";
import {WalletCurrency} from "../models/WalletCurrency";
import { getTokenPriceInUsd, listCoinGeckoTokens } from '../clients/ethereum'
import * as RedisClient from '../clients/redis';

export const registerNewCrypto = async (args: {name: string, contractAddress: string}, context: {user: any}) => {
  const {company} = checkPermissions({hasRole: ['admin']}, context);
  const { name, contractAddress } = args;
  const org = await Org.findOne({where: {name: company}, relations: ['wallet']});
  if (!org) throw new FailureByDesign('NOT_FOUND', 'org not found');
  let cryptoCurrency = await CryptoCurrency.findOne({where: {contractAddress: contractAddress}});
  if (cryptoCurrency) throw new FailureByDesign('ALREADY_EXISTS', 'crypto currency already exists');
  cryptoCurrency = CryptoCurrency.newCryptoCurrency(name, contractAddress);
  const walletCurrency = WalletCurrency.newWalletCurrency(name, org.wallet);
  await walletCurrency.save();
  org.wallet.currency.push(walletCurrency);
  await org.wallet.save();
  await cryptoCurrency.save();
  return walletCurrency.asV1();
}

export const addCryptoToWallet = async (args: {contractAddress: string}, context: { user: any }) => {
  const {company} = checkPermissions({hasRole: ['admin']}, context);
  const { contractAddress } = args;
  const org = await Org.findOne({where: {name: company}, relations: ['wallet']});
  if (!org) throw new FailureByDesign('NOT_FOUND', 'org not found');
  const cryptoCurrency = await CryptoCurrency.findOne({where: {contractAddress}});
  if (!cryptoCurrency) throw new FailureByDesign('NOT_FOUND', 'crypto currency not found');
  const walletCurrency = WalletCurrency.newWalletCurrency(cryptoCurrency.type, org.wallet);
  await walletCurrency.save();
  return walletCurrency.asV1();
}

export const listSupportedCrypto = async (args: any, context: any) => {
  const crypto = await CryptoCurrency.find();
  return crypto.map(token => token.asV1());
}

export const deleteCryptoFromWallet = async (args: {id: string}, context: {user: any}) => {
  const {company} = checkPermissions({hasRole: ['admin']}, context);
  const org = await Org.findOne({where: {name: company}, relations: ['wallet']});
  if (!org) throw new FailureByDesign('NOT_FOUND', 'org not found');
  const currency = await WalletCurrency.findOne({where: {wallet: org.wallet, id: args.id}});
  if (!currency) throw new FailureByDesign('NOT_FOUND', 'currency not found on wallet');
  if (currency.balance.gt(0)) throw new FailureByDesign('FUNDS_EXIST', 'wallet holds crypto');
  await currency.remove();
  return currency.id;
}

export const getTokenInUSD = async (args: { symbol: string }, _context: { user: any }) => {
  const price = await getTokenPriceInUsd(args.symbol.toLowerCase());
  return parseFloat(price.toString());
}

export const getTokenIdBySymbol = async (args: { symbol: string }, _context: { user: any }) => {
  await listCoinGeckoTokens();
  const tokenId = await RedisClient.getRedis().get(`TOKEN:IDS:${args.symbol.toLowerCase()}`);
  if (!tokenId) throw new FailureByDesign('TOKEN_NOT_FOUND', 'Token not found on coingecko list');
  return tokenId;
}