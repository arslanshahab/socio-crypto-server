import crypto from 'crypto';
import sha3 from 'js-sha3';
import bs58 from 'bs58';
import * as secp256k1 from 'secp256k1';
import { Secrets } from './secrets';
import { Factor } from '../models/Factor';

const IV_LENGTH = 16; // For AES, this is always 16

export const encrypt = (dataToEncrypt: string): string => {
  const key = crypto.createHash('sha256').update(Secrets.encryptionKey).digest('base64').substr(0, 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encryptedData = cipher.update(dataToEncrypt);
  encryptedData = Buffer.concat([encryptedData, cipher.final()]);

  return iv.toString('hex') + ':' + encryptedData.toString('hex');
};

export const decrypt = (dataToDecrypt: string): string => {
  const key = crypto.createHash('sha256').update(Secrets.encryptionKey).digest('base64').substr(0, 32);
  const parts = dataToDecrypt.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decryptedData = decipher.update(encryptedData);
  decryptedData = Buffer.concat([decryptedData, decipher.final()]);

  return decryptedData.toString();
};

export const sha256Hash = (data: any): string => crypto.createHash('sha256').update(data).digest('base64');

const sha3_256Hash = (data: any) => Buffer.from(sha3.sha3_256.update(data).digest());

const orderedHashFactorList = (factor: Factor) => {
  try {
    const hashBufList = [];
    hashBufList.push(Buffer.from(factor.id, 'utf8'));
    hashBufList.push(Buffer.from(factor.providerId, 'utf8'));
    hashBufList.push(Buffer.from(factor.name, 'utf8'));
    hashBufList.push(Buffer.from(factor.factor, 'utf8'));
    return hashBufList;
  } catch (error) {
    throw new Error('Error while hashing factor (possible malformed factor)');
  }
}

const orderedIdentityLoginRequestHashList = (identity: any) => {
  try {
    const hashBufList = [];
    hashBufList.push(Buffer.from(identity.service, 'utf8'));
    hashBufList.push(Buffer.from(identity.timestamp, 'utf8'));
    hashBufList.push(Buffer.from(identity.identity.publicKey, 'utf8'));
    hashBufList.push(Buffer.from(identity.identity.keyType, 'utf8'));
    hashBufList.push(Buffer.from(identity.identity.signature.signingKeyId, 'utf8'));
    hashBufList.push(Buffer.from(identity.identity.signature.signature));
    if (identity.identity.revokeTime) hashBufList.push(Buffer.from(identity.identity.revokeTime.timestamp, 'utf8'));
    return hashBufList;
  } catch (error) {
    console.error(error);
    console.error(error.message);
    throw new Error('Error while identity factor login request (possible malformed identity request)');
  }
};

const hashFactorForSigning = (factor: Factor) => sha256Hash(Buffer.concat(orderedHashFactorList(factor)));

const hashIdentityLoginForSigning = (identity: any) => sha256Hash(Buffer.concat(orderedIdentityLoginRequestHashList(identity)));

export const signIdentityLoginRequest = (identity: any, privateKey: string) => secp256k1.ecdsaSign(Buffer.from(hashIdentityLoginForSigning(identity), 'base64'), Buffer.from(privateKey)).signature;

export const signFactor = (factor: Factor) => secp256k1.ecdsaSign(Buffer.from(hashFactorForSigning(factor), 'base64'), Buffer.from(Secrets.factorProviderPrivateKey, 'base64')).signature;

export const getDeterministicId = (publicKey: string) => {
  const pubKey = Buffer.from(publicKey, 'base64');
  const mid = Buffer.allocUnsafe(20);
  const final = Buffer.allocUnsafe(22);
  // Get actual id
  sha3_256Hash(pubKey).copy(mid, 0, 0, 20);
  // Get checksum
  sha3_256Hash(mid).copy(final, 20, 0, 2);
  // Combine the two into our final id and return the base58 encoding
  mid.copy(final);
  return bs58.encode(final);
};