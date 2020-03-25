import { Request, Response, NextFunction } from 'express';

const { NODE_ENV = 'development' } = process.env;

export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
  console.log('==============================================');
  console.log(`URL: ${req.originalUrl}`);
  console.log(`Querystring: ${JSON.stringify(req.query)}`);
  if (NODE_ENV !== 'production') console.log(`Headers: ${JSON.stringify(req.headers)}`);
  console.log('==============================================');
  return next();
};