import crypto from 'crypto';
import * as secp256k1 from 'secp256k1';
import { Secrets } from './secrets';
import { Dragonfactor } from '../clients/dragonfactor';
import { GenericFactor, GenericFactorAssociation, DragonfactorLoginRequest } from '../types';

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

const orderedFactorHashList = (factor: GenericFactor, signature = false): Buffer[] => {
  try {
    const hashBufList: Buffer[] = [];
    hashBufList.push(Buffer.from(factor.id, 'utf8'));
    hashBufList.push(Buffer.from(factor.providerId, 'utf8'));
    hashBufList.push(Buffer.from(factor.name, 'utf8'));
    hashBufList.push(Buffer.from(factor.factor, 'utf8'));
    hashBufList.push(Buffer.from(factor.expiry || '', 'utf8'));
    if (signature) {
      hashBufList.push(Buffer.from(factor['signature'], 'utf8'));
    }
    return hashBufList;
  } catch (e) {
    throw new Error('Error while hashing factor (possible malformed factor)');
  }
};

const orderedFactorLoginRequestHashList = (request: DragonfactorLoginRequest): Buffer[] => {
  try {
    console.log(request);
    const hashBufList: Buffer[] = [];
    hashBufList.push(Buffer.from(request.service, 'utf8'));
    hashBufList.push(Buffer.from(request.factorType, 'utf8'));
    hashBufList.push(Buffer.from(request.factor, 'utf8'));
    hashBufList.push(Buffer.from(request.signingPublicKey, 'utf8'));
    hashBufList.push(Buffer.from(request.timestamp, 'utf8'));
    // hash the factor association info
    hashBufList.push(Buffer.from(request.factorAssociation.publicKey, 'utf8'));
    hashBufList.push(Buffer.from(request.factorAssociation.publicSignSignature, 'utf8'));
    hashBufList.push(Buffer.from(request.factorAssociation.signPublicSignature, 'utf8'));
    return hashBufList;
  } catch (error) {
    console.error(error);
    console.error(error.message);
    throw new Error('Error while hashing factor login request (possible malformed factor)');
  }
};

const sha256Hash = (input: Buffer): Buffer => {
  return crypto.createHash('sha256').update(input).digest();
}

const hashFactorForSigning = (factor: GenericFactor): Buffer => {
  return sha256Hash(Buffer.concat(orderedFactorHashList(factor)));
};

const hashLoginRequestForSigning = (request: DragonfactorLoginRequest): Buffer => {
  console.log(`BIFFER: ${orderedFactorLoginRequestHashList(request)}`);
  console.log(`BUFFER: ${Buffer.concat(orderedFactorLoginRequestHashList(request))}`);
  return sha256Hash(Buffer.concat(orderedFactorLoginRequestHashList(request)));
}

export const verifySignature = (message: Buffer, signature: Buffer, publicKey: Buffer): boolean => {
  return secp256k1.ecdsaVerify(signature, message, publicKey);
};

export const verifyLoginRequestSignature = (request: DragonfactorLoginRequest) => {
  try {
    const msg: Buffer = hashLoginRequestForSigning(request);
    return verifySignature(msg, Buffer.from(request.signature, 'base64'), Buffer.from(request.signingPublicKey, 'base64'));
  } catch (error) {
    console.error('Failed to login request signature');
    console.error(error.message);
    throw new Error('failed to verify login request signature');
  }
}

export const verifyFactor = async (factor: GenericFactor): Promise<boolean> => {
  try {
    const provider = await Dragonfactor.getProvider(factor.providerId);
    const msg: Buffer = hashFactorForSigning(factor);
    return verifySignature(msg, Buffer.from(factor.signature, 'base64'), Buffer.from(provider.publicKey, 'base64'));
  } catch (error) {
    console.error('Failed to verify factor');
    console.error(error.message);
    throw new Error('failed to verify factor signature');
  }
};

export const verifyCrossSigning = (association: GenericFactorAssociation, signingPublicKey: string) => {
  try {
    const signPubHash = sha256Hash(Buffer.from(signingPublicKey, 'base64'));
    const factorPubHash = sha256Hash(Buffer.from(association.publicKey, 'base64'));
    if (!verifySignature(signPubHash, Buffer.from(association.publicSignSignature, 'base64'), Buffer.from(association.publicKey, 'base64'))) return false;
    if (!verifySignature(factorPubHash, Buffer.from(association.signPublicSignature, 'base64'), Buffer.from(signingPublicKey, 'base64'))) return false;
    return true;
  } catch (error) {
    console.error('failed to verify cross signing: ', error);
    throw new Error('failed to verify cross signing of factor');
  }
}
