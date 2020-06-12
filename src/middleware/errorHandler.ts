import { Request, Response, NextFunction } from 'express';
import logger from '../util/logger';
import { SNS } from '../clients/sns';

const { NODE_ENV = 'development' } = process.env;

const reportErrorIfNecessary = (err: any, httpStatusCode: number) => {
  if (httpStatusCode.toString().startsWith('5') && (NODE_ENV === 'production' || NODE_ENV === 'staging')) {
    SNS.sendErrorReport(err);
  }
};

export const errorHandler = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err) {
    logger.debug('Stack trace:', err.stack || 'Unknown');
    logger.error(JSON.stringify(err));
    reportErrorIfNecessary(err, 500);
    return res.status(500).send(err.message);
  }
  next();
};