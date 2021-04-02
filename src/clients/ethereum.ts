import fetch from "node-fetch";
import { CryptoCurrency } from "../models/CryptoCurrency";
import { BN } from "../util/helpers";
import * as RedisClient from './redis';

const v3BaseUrl = 'https://api.coingecko.com/api/v3';
const getTokenPriceInEthKey = (symbol: string) => `TOKEN:PRICE:ETH:${symbol}`;
const getTokenPriceInUsdKey = (symbol: string) => `TOKEN:PRICE:USD:${symbol}`;

export const listCoinGeckoTokens = async () => {
  const shouldRefresh = !(await RedisClient.getRedis().get('TOKENS:LIST'));
  if (!shouldRefresh) return await RedisClient.getRedis().get('TOKENS:LIST');
  const resp = await (await fetch(`${v3BaseUrl}/coins/list?include_platform=true`)).json();
  for (let i = 0; i < resp.length; i++) {
    await RedisClient.getRedis().set(`TOKEN:IDS:${resp[i].symbol.toLowerCase()}`, resp[i].id);
    await RedisClient.getRedis().set(`TOKEN:ADDRESS:${resp[i].symbol.toLowerCase()}`, resp[i].platforms.ethereum != null ? resp[i].platforms.ethereum : "");
  }
  await RedisClient.getRedis().set('TOKENS:LIST', 'a');
  return await RedisClient.getRedis().expire('TOKENS:LIST', 1800);
}

export const getTokenPriceInUsd = async (symbol: string) => {
  await listCoinGeckoTokens();
  const cryptoCurrency = await CryptoCurrency.findOne({ where: { type: symbol.toLowerCase() } });
  const contractAddress = await RedisClient.getRedis().get(`TOKEN:ADDRESS:${symbol.toLowerCase()}`)
  if (!contractAddress) return new BN(0); // If symbol does not have an eth address listen on coiingeck
  if (contractAddress != cryptoCurrency?.contractAddress) return new BN(0); // If raiinmaker token and coiingecko token have different addresses
  const key = getTokenPriceInUsdKey(symbol);
  const cachedResponse = await RedisClient.getRedis().get(key);
  if (cachedResponse) return new BN(cachedResponse);
  const symbolId = await RedisClient.getRedis().get(`TOKEN:IDS:${symbol}`);
  if (!symbolId) return new BN(0);
  const resp = await (await fetch(`${v3BaseUrl}/simple/price?ids=${symbolId}&vs_currencies=usd`)).json();
  if (Object.keys(resp).length === 0) return new BN(0);
  const price = resp[symbolId].usd;
  await RedisClient.getRedis().set(key, price);
  await RedisClient.getRedis().expire(key, 1800);
  return new BN(price);
}

export const getTokenPriceInEth = async (symbol: string) => {
  await listCoinGeckoTokens();
  const key = getTokenPriceInEthKey(symbol);
  const cachedResponse = await RedisClient.getRedis().get(key);
  if (cachedResponse) return new BN(cachedResponse);
  const symbolId = await RedisClient.getRedis().get(`TOKEN:IDS:${symbol}`);
  if (!symbolId) return new BN(0);
  const resp = await (await fetch(`${v3BaseUrl}/simple/price?ids=${symbolId}&vs_currencies=eth`)).json();
  if (Object.keys(resp).length === 0) return new BN(0);
  const price = resp[symbolId].eth;
  await RedisClient.getRedis().set(key, price);
  await RedisClient.getRedis().expire(key, 1800);
  return new BN(price);
}

export const getEthPriceInUSD = async () => {
  const resp = await fetch(
    `${v3BaseUrl}/simple/price?ids=ethereum&vs_currencies=usd`,
    {
      method: 'get',
      headers: { 'Content-Type': 'application/json' }
    }
  );
  return (await resp.json()).ethereum.usd;
}
