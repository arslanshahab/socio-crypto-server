import { getRedis } from "../clients/redis";

const { RATE_LIMIT_MAX } = process.env;

/**
 * limit: basic ratelimiter
 * @param limitingKey key to ratelimit on
 * @param requestsPerDay number of requests per day allowed for that limitingKey
 */
export const limit = async (
    limitingKey: string,
    maxRequests: number = 4,
    timePeriod: "day" | "hour" | "minute" = "day"
): Promise<boolean> => {
    const key = `ratelimit-${limitingKey}`;
    const client = getRedis();
    const requests = await client.get(key);
    if (requests !== null && Number(requests) >= Number(RATE_LIMIT_MAX || maxRequests)) return true;
    await client.incr(key);
    const expiration = timePeriod === "day" ? 86400 : timePeriod === "hour" ? 3600 : 60;
    if (requests === null) await client.expire(key, expiration); // expire the key in a day
    return false;
};
