import { promisify } from 'util';
import { readFile } from 'fs';

const readFilePromise = promisify(readFile);

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
  }
}