import { promisify } from 'util';
import { readFile } from 'fs';

const readFilePromise = promisify(readFile);

export class Secrets {
  public static firebaseProjectId: string;
  public static firebasePrivateKey: string;
  public static firebaseClientEmail: string;
  public static bearerToken: string;

  public static async initialize() {
    Secrets.firebaseProjectId = process.env.FIREBASE_PROJECT_ID || (await readFilePromise('/var/secrets/firebase-credentials/firebaseProjectId', 'utf8'));
    Secrets.firebasePrivateKey = (process.env.FIREBASE_PRIVATE_KEY || (await readFilePromise('/var/secrets/firebase-credentials/firebasePrivateKey', 'utf8'))).replace(/\\n/g,'\n');
    Secrets.firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL || (await readFilePromise('/var/secrets/firebase-credentials/firebaseClientEmail', 'utf8'));
    Secrets.bearerToken = process.env.BEARER_TOKEN || (await readFilePromise('/var/secrets/bearer-token/SecretString', 'utf8'));
  }
}