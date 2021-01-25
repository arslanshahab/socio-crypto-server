import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Secrets } from '../util/secrets';
import {AuthRequest} from '../types';
import { serverBaseUrl } from '../config';
import {Firebase} from "../clients/firebase";
import { AuthenticationError } from 'apollo-server-express';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const bearerToken = req.headers.authorization;
  if (!bearerToken) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
  try {
    if (process.env.NODE_ENV === 'test' && bearerToken === 'Bearer raiinmaker') {
      const company = req.get('company') || 'raiinmaker';
      const id = req.get('user-id') || 'banana';
      const role = req.get('role') || 'admin';
      req.user = { id, company, role };
      return next();
    }
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

export const firebaseAuth = async ({req, res}: {req: AuthRequest, res: Response}) => {
  try {
    if (process.env.NODE_ENV === 'development' && req.headers.token === 'Bearer raiinmaker') return;
    const session = req.cookies.session || '';
    if (!session) throw new AuthenticationError('unauthorized');
    const decodedToken = await Firebase.verifySessionCookie(session);
    const firebaseUser = await Firebase.client.auth().getUser(decodedToken.uid);
    if (!firebaseUser) throw new AuthenticationError('unauthorized');
    let user: { [key: string]: string | boolean } = { id: decodedToken.uid, method: 'firebase'};
    if (firebaseUser.customClaims) user = {
      ...user,
      role: firebaseUser.customClaims.role,
      company: firebaseUser.customClaims.company,
      tempPass: firebaseUser.customClaims.tempPass || false,
    };
    return {user};
  } catch (e) {
    throw new AuthenticationError('unauthorized');
  }
}

export const checkPermissions = (opts: { hasRole?: string[], restrictCompany?: string }, context: { user: any }) => {
  const { role, id, company } = context.user;
  console.log(`UID: ${id} requesting a admin route`);
  if (opts.hasRole) {
    if (!role || !opts.hasRole.includes(role)) throw new Error('forbidden');
  }
  if (opts.restrictCompany) {
    if (company !== opts.restrictCompany) throw new Error('forbidden');
  }
  if (role === 'manager' && !company) throw new Error('forbidden, company not specified');
  return { role, company };
}
