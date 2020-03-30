import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Secrets } from '../util/secrets';
import { Firebase } from '../clients/firebase';
import { AuthRequest } from '../types';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const idToken = req.headers.authorization;
  if (!idToken) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
  try {
    const decodedToken = await Firebase.client.auth().verifyIdToken(idToken);
    if (!decodedToken) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
    req.user = { id: decodedToken.user_id, email: decodedToken.email };
    return next();
  } catch (e) {
    const secret = `Bearer ${Secrets.bearerToken}`;
    const authorizationBuffer = idToken.length !== secret.length ? Buffer.alloc(secret.length, 0) : Buffer.from(idToken, 'utf-8');
    if (crypto.timingSafeEqual(authorizationBuffer, Buffer.from(secret, 'utf-8'))) return next();
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
  }
};
