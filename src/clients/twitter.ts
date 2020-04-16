import Twitter from 'twitter';
import logger from '../util/logger';
import { Secrets } from '../util/secrets';
import { SocialClientCredentials } from '../types';

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

  public static post = async (credentials: SocialClientCredentials, text: string, photo?: string): Promise<string> => {
    logger.debug(`posting tweet to twitter with text: ${text}`);
    const options: {[key: string]: string} = { status: text };
    const client = TwitterClient.getClient(credentials);
    if (photo) options['media_ids'] = await TwitterClient.postImage(client, photo);
    const response = await client.post('/statuses/update', options);
    return response.id_str;
  }
}