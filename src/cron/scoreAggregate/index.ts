import { Application } from '../../app';
import { Firebase } from '../../clients/firebase';
import { Secrets } from '../../util/secrets';
import logger from "../../util/logger";
import * as cron from './scoreAggregate';

const app = new Application();

(async () => {
  // create connections
  logger.info('Starting 24 hour cron');
  await Secrets.initialize();
  await Firebase.initialize();
  const connection = await app.connectDatabase();
  await cron.main();
  // cleanup connections
  logger.info('closing connection');
  await connection.close();
  process.exit(0);
})();