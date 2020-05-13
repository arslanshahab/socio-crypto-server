import express from 'express';
import cors from 'cors';
import expressGraphql from 'express-graphql';
import { Server } from 'http';
import bodyParser from 'body-parser';
import {Connection, getConnectionOptions, createConnection} from 'typeorm';
import logger from './util/logger';
import { getSchema, root, publicRoot } from './graphql';
import { Secrets } from './util/secrets';
import { Firebase } from './clients/firebase';
import { authenticate } from './middleware/authentication';
import { requestLogger } from './middleware/logging';
import { Dragonchain } from './clients/dragonchain';
import * as Dragonfactor from './controllers/dragonfactor';
import * as ExpressDragonfactor from '@dragonchain-dev/dragonfactor-auth';

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
    this.app = express();
    const corsSettings = {
      origin: [
        'https://raiinmaker.dragonchain.com',
        'https://raiinmaker-staging.dragonchain.com',
        'https://mock-raiinmaker-landing.dragonchain.com'
      ],
      methods: ['GET','POST'],
      exposedHeaders: ['x-auth-token'],
    };
    if (NODE_ENV === 'development') corsSettings.origin.push('http://localhost:3000');
    this.app.use(cors(corsSettings));
    this.app.use(bodyParser.json({ limit: "20mb" }));
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.set('port', process.env.PORT || 8080);
    this.app.use('/v1/graphql', requestLogger, authenticate, expressGraphql({
      schema: await getSchema(),
      rootValue: root,
      graphiql: NODE_ENV !== 'production',
    }));
    this.app.use('/v1/public/graphql', expressGraphql({
      schema: await getSchema(),
      rootValue: publicRoot,
      graphiql: NODE_ENV === 'development',
    }));
    this.app.get('/v1/health', (_req: express.Request, res: express.Response) => res.send('I am alive and well, thank you!'));
    this.app.use('/v1/dragonfactor/login', ExpressDragonfactor.expressMiddleware({ service: 'raiinmaker', acceptedFactors: ['email'] }), Dragonfactor.login);
  }

  public async startServer() {
    this.runningServer = this.app.listen(this.app.get('port'), '0.0.0.0', () => {
      logger.info(`App is running at http://localhost:${this.app.get('port')} in ${this.app.get('env')} mode`);
      logger.info('Press CTRL-C to stop\n');
    });
  }
}
