import express from 'express';
import cors from 'cors';
import expressGraphql from 'express-graphql';
import { Server } from 'http';
import bodyParser from 'body-parser';
import {Connection, getConnectionOptions, createConnection} from 'typeorm';
import logger from './util/logger';
import { getSchema, root, publicRoot } from './graphql';
import { Secrets } from './util/secrets';
import {authenticate} from './middleware/authentication';
import { errorHandler } from './middleware/errorHandler';
import { Dragonchain } from './clients/dragonchain';
import { Firebase } from './clients/firebase';
import * as FactorController from './controllers/factor';
import * as Dragonfactor from '@dragonchain-dev/dragonfactor-auth';
import {paypalWebhook} from "./controllers/withdraw";
import {Paypal} from "./clients/paypal";

const { NODE_ENV = 'development' } = process.env;

export class Application {
  public app: express.Application;
  public runningServer: Server;
  public databaseConnection: Connection;

  public async connectDatabase() {
    const connectionOptions = await getConnectionOptions();
    Object.assign(connectionOptions, { entities: [__dirname + '/models/*'] });
    return await createConnection(connectionOptions);
  }


  public async initializeServer() {
    this.databaseConnection = await this.connectDatabase();
    await Secrets.initialize();
    await Firebase.initialize();
    await Dragonchain.initialize();
    await Paypal.initialize();
    await Paypal.refreshToken();

    this.app = express();
    const corsSettings = {
      origin: [
        'http://localhost:9000',
        'https://raiinmaker.dragonchain.com',
        'https://raiinmaker-staging.dragonchain.com',
        'https://mock-raiinmaker-landing.dragonchain.com',
        'https://raiinmaker.com',
        'https://www.raiinmaker.com'
      ],
      methods: ['GET','POST'],
      exposedHeaders: ['x-auth-token'],
    };
    if (NODE_ENV === 'development') corsSettings.origin.push('http://localhost:3000');
    if (NODE_ENV === 'staging') corsSettings.origin.push('http://localhost:9000');
    this.app.use(cors(corsSettings));
    this.app.use(bodyParser.json({ limit: "20mb" }));
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.set('port', process.env.PORT || 8080);
    const extensions: any = (params: any) => {
      console.log({ timestamp: new Date().toISOString(), operation: params.operationName });
      return { operation: params.operationName }
    };
    this.app.use('/v1/graphql', authenticate, expressGraphql({
      schema: await getSchema(),
      rootValue: root,
      graphiql: NODE_ENV !== 'production',
      extensions: extensions,
      customFormatErrorFn: (error) => {
        return {
          message: error.message,
          locations: error.locations,
          stack: error.stack ? error.stack.split('\n') : [],
          path: error.path,
        }
      }
    }));
    this.app.use('/v1/public/graphql', expressGraphql({
      schema: await getSchema(),
      rootValue: publicRoot,
      graphiql: NODE_ENV === 'development',
      extensions: extensions,
    }));
    this.app.get('/v1/health', (_req: express.Request, res: express.Response) => res.send('I am alive and well, thank you!'));
    this.app.post('/v1/payouts', paypalWebhook);
    this.app.use('/v1/dragonfactor/login', Dragonfactor.expressMiddleware({ service: 'raiinmaker', acceptedFactors: ['email'], timeVariance: 5000 }), FactorController.login);
    this.app.use('/v1/dragonfactor/recover', Dragonfactor.accountRecoveryMiddleware({ service: 'raiinmaker', timeVariance: 5000 }), FactorController.recover);
    this.app.use(errorHandler);
  }

  public async startServer() {
    this.runningServer = this.app.listen(this.app.get('port'), '0.0.0.0', () => {
      this.runningServer.timeout = 1000000;
      this.runningServer.keepAliveTimeout = 90000;
      logger.info(`App is running at http://localhost:${this.app.get('port')} in ${this.app.get('env')} mode`);
      logger.info('Press CTRL-C to stop\n');
    });
  }
}
