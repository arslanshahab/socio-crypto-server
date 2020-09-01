import { getRedis } from '../clients/redis';

const { RATE_LIMIT_MAX } = process.env;

/**
 * limit: basic ratelimiter
 * @param limitingKey key to ratelimit on
 * @param requestsPerDay number of requests per day allowed for that limitingKey
 */
export const limit = async (limitingKey: string, requestsPerDay: number = 3): Promise<boolean> => {
  const key = `ratelimit-${limitingKey}`;
  const client = getRedis();
  const requests = await client.get(key);
  if (requests !== null && Number(requests) >= Number(RATE_LIMIT_MAX || requestsPerDay)) return true;
  await client.incr(key);
  if (requests === null) await client.expire(key, 86400); // expire the key in a day
  return false;
}