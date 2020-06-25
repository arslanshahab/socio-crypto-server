import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Secrets } from '../util/secrets';
import { AuthRequest } from '../types';
import { serverBaseUrl } from '../config';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const bearerToken = req.headers.authorization;
  if (!bearerToken) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
  try {
    const decodedToken = jwt.verify(bearerToken, Secrets.encryptionKey, { audience: serverBaseUrl }) as any;
    if (!decodedToken) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
    req.user = { id: decodedToken.id, role: decodedToken.role, company: decodedToken.company };
    return next();
  } catch (e) {
    const secret = `Bearer ${Secrets.bearerToken}`;
    const authorizationBuffer = bearerToken.length !== secret.length ? Buffer.alloc(secret.length, 0) : Buffer.from(bearerToken, 'utf-8');
    if (crypto.timingSafeEqual(authorizationBuffer, Buffer.from(secret, 'utf-8'))) {
      req.user = { role: 'admin' };
      return next();
    }
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
  }
};

export const checkPermissions = (opts: { hasRole: string[] }, context: { user: any }) => {
  const { role, uid, company } = context.user;
  console.log(`UID: ${uid} requesting a admin route`);
  if (!role || !opts.hasRole.includes(role)) throw new Error('forbidden');
  if (role === 'manager' && !company) throw new Error('forbidden, company not specified');
  return { role, company };
}
