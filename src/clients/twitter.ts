import Twitter from 'twitter';
import logger from '../util/logger';
import { Secrets } from '../util/secrets';
import { SocialClientCredentials } from '../types';
import { getRedis } from './redis';

export class TwitterClient {
  public static getClient(userCredentials: SocialClientCredentials): Twitter {
    return new Twitter({
      consumer_key: Secrets.twitterConsumerKey,
      consumer_secret: Secrets.twitterConsumerSecretKey,
      access_token_key: userCredentials.apiKey as string,
      access_token_secret: userCredentials.apiSecret as string
    });
  }

  public static postImage = async (client: Twitter, photo: string): Promise<string> => {
    logger.info('posting image to twitter');
    const options = { media_category: 'tweet_image', media_data: photo };
    const response = await client.post('/media/upload', options);
    return response.media_id_string;
  }

  public static postVideo = async (client: Twitter, video: string): Promise<string> => {
    logger.info('posting video to twitter');
    const options = { media_category: 'tweet_video', media_data: video };
    const response = await client.post('/media/upload', options);
    return response.media_id_string;
  }

  public static post = async (credentials: SocialClientCredentials, text: string, data?: string, mediaType?: 'photo'|'video'): Promise<string> => {
    logger.debug(`posting tweet to twitter with text: ${text}`);
    const options: {[key: string]: string} = { status: text };
    const client = TwitterClient.getClient(credentials);
    if (data) options['media_ids'] = mediaType === 'photo' ? await TwitterClient.postImage(client, data) : await TwitterClient.postVideo(client, data);
    const response = await client.post('/statuses/update', options);
    return response.id_str;
  }

  public static get = async (credentials: SocialClientCredentials, id: string, cached = true): Promise<string> => {
    logger.debug(`retrieving tweet with id: ${id}`);
    let cacheKey = `twitter:${id}`;
    if (cached) {
      const cachedResponse = await getRedis().get(cacheKey);
      if (cachedResponse) return cachedResponse;
    }
    const client = TwitterClient.getClient(credentials);
    const twitterResponse = await client.get('/statuses/show', {id});
    await getRedis().set(cacheKey, JSON.stringify(twitterResponse), 'EX', 900); // cache for 15 minutes
    return JSON.stringify(twitterResponse);
  }
}
