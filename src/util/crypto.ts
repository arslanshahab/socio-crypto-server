import crypto from 'crypto';
import { Secrets } from './secrets';

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

export const sha256Hash = (data: string): string => crypto.createHash('sha256').update(data).digest('base64');
