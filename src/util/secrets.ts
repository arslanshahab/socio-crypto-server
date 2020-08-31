import { promisify } from 'util';
import { readFile } from 'fs';

const readFilePromise = promisify(readFile);


const {NODE_ENV} = process.env;

export class Secrets {
  public static firebaseProjectId: string;
  public static firebasePrivateKey: string;
  public static firebaseClientEmail: string;
  public static bearerToken: string;
  public static dragonchainId: string;
  public static dragonchainEndpoint: string;
  public static dragonchainApiKeyId: string;
  public static dragonchainApiKey: string;
  public static encryptionKey: string;
  public static twitterConsumerKey: string;
  public static twitterConsumerSecretKey: string;
  public static paypalClientId: string;
  public static paypalClientSecret: string;
  public static paypalWebhookId: string;

  public static async initialize() {
    Secrets.firebaseProjectId = process.env.FIREBASE_PROJECT_ID || (await readFilePromise('/var/secrets/firebase-credentials/firebaseProjectId', 'utf8'));
    Secrets.firebasePrivateKey = (process.env.FIREBASE_PRIVATE_KEY || (await readFilePromise('/var/secrets/firebase-credentials/firebasePrivateKey', 'utf8'))).replace(/\\n/g,'\n');
    Secrets.firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL || (await readFilePromise('/var/secrets/firebase-credentials/firebaseClientEmail', 'utf8'));
    Secrets.bearerToken = process.env.BEARER_TOKEN || (await readFilePromise('/var/secrets/bearer-token/SecretString', 'utf8'));

    Secrets.dragonchainId = process.env.DRAGONCHAIN_ID || (await readFilePromise('/var/secrets/dragonchain-credentials/dragonchainId', 'utf8'));
    Secrets.dragonchainEndpoint = process.env.DRAGONCHAIN_ENDPOINT || (await readFilePromise('/var/secrets/dragonchain-credentials/dragonchainEndpoint', 'utf8'));
    Secrets.dragonchainApiKeyId = process.env.DRAGONCHAIN_API_KEY_ID || (await readFilePromise('/var/secrets/dragonchain-credentials/dragonchainApiKeyId', 'utf8'));
    Secrets.dragonchainApiKey = process.env.DRAGONCHAIN_API_KEY || (await readFilePromise('/var/secrets/dragonchain-credentials/dragonchainApiKey', 'utf8'));
    Secrets.encryptionKey = process.env.ENCRYPTION_KEY || (await readFilePromise('/var/secrets/encryption-key/SecretString', 'utf8'));
    Secrets.twitterConsumerKey = process.env.TWITTER_CONSUMER_KEY || (await readFilePromise('/var/secrets/twitter-credentials/consumerKey', 'utf8'));
    Secrets.twitterConsumerSecretKey = process.env.TWITTER_CONSUMER_SECRET_KEY || (await readFilePromise('/var/secrets/twitter-credentials/consumerSecretKey', 'utf8'));

    // Defaults to sandbox creds
    Secrets.paypalClientId = process.env.PAYPAL_CLIENT_ID || (await readFilePromise('/var/secrets/paypal-credentials/clientId', 'utf8'));
    Secrets.paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || (await readFilePromise('/var/secrets/paypal-credentials/clientSecret', 'utf8'));
    Secrets.paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID || (await readFilePromise('/var/secrets/paypal-credentials/webhookId', 'utf8'));

  }
}
