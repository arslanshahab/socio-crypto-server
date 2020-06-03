import {getConnection} from "typeorm";
import { Application } from '../../app';
import { Secrets } from '../../util/secrets';
import {User} from '../../models/User';
import logger from "../../util/logger";
import { TwentyFourHourMetric } from '../../models/TwentyFourHourMetric';

const app = new Application();

(async () => {
  // create connections
  logger.info('Starting 24 hour cron');
  await Secrets.initialize();
  const connection = await app.connectDatabase();
  const metricsToSave: TwentyFourHourMetric[] = [];

  const users = await User.find();

  for (const user of users) {
    const totalParticipationScore = await User.getUserTotalParticipationScore(user.id);
    const metric = new TwentyFourHourMetric();
    metric.score = BigInt(totalParticipationScore);
    metric.user = user;
    metricsToSave.push(metric);
  }

  await getConnection().createEntityManager().save(metricsToSave);

  // cleanup connections
  logger.info('closing connection');
  await connection.close();
  process.exit(0);
})();