import express from 'express';
import cors from 'cors';
import expressGraphql from 'express-graphql';
import { Server } from 'http';
import { createConnection, getConnectionOptions } from 'typeorm';
import logger from './util/logger';
import { getSchema, root, publicRoot } from './graphql';

const { NODE_ENV = 'development' } = process.env;

export class Application {
  public app: express.Application;
  public runningServer: Server;

  public async connectDatabase() {
    const connectionOptions = await getConnectionOptions();
    Object.assign(connectionOptions, { entities: [__dirname + '/models/*'] });
    await createConnection(connectionOptions);
  }

  public async initializeServer() {
    await this.connectDatabase();

    this.app = express();
    const corsSettings = {
      origin: [
        'https://raiinmaker.dragonchain.com',
        'https://raiinmaker-staging.dragonchain.com',
      ],
      methods: ['GET','POST'],
      exposedHeaders: ['x-auth-token'],
    };
    if (NODE_ENV === 'development') corsSettings.origin.push('http://localhost:3000');
    this.app.use(cors(corsSettings));
    this.app.set('port', process.env.PORT || 8080);
    this.app.use('/v1/graphql', expressGraphql({
      schema: await getSchema(),
      rootValue: root,
      graphiql: NODE_ENV !== 'production',
    }));
    this.app.use('/v1/public/graphql', expressGraphql({
      schema: await getSchema(),
      rootValue: publicRoot,
      graphiql: NODE_ENV === 'development',
    }));
    this.app.get('/v1/health', (_req: express.Request, res: express.Response) => res.send('I am awake and functioning, thanks!'));
  }

  public async startServer() {
    this.runningServer = this.app.listen(this.app.get('port'), '0.0.0.0', () => {
      logger.info(`App is running at http://localhost:${this.app.get('port')} in ${this.app.get('env')} mode`);
      logger.info('Press CTRL-C to stop\n');
    });
  }
}