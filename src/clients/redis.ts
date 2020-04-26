import redis from 'redis';
import { promisify } from 'util';

const { REDIS_HOST = 'localhost', REDIS_PORT = '6379' } = process.env;

export class RedisClient {
  public client: redis.RedisClient;
  public get: any;
  public set: any;

  constructor(host = 'localhost', port = 6379, injected: any = {}) {
    this.client = injected.redisClient || redis.createClient({ host, port });
    this.get = promisify(this.client.get).bind(this.client);
    this.set = promisify(this.client.set).bind(this.client);
  }
}

let cacheRedis: RedisClient | undefined = undefined;
export const getRedis = () => {
  if (!cacheRedis) cacheRedis = new RedisClient(REDIS_HOST, Number(REDIS_PORT));
  return cacheRedis;
}