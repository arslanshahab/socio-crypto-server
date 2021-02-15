import {Connection} from "typeorm";
import {connectDatabase} from "./helpers";
import {Participant} from "../../src/models/Participant";
import {Campaign} from "../../src/models/Campaign";
import {Wallet} from "../../src/models/Wallet";
import {User} from "../../src/models/User";
import {Org} from "../../src/models/Org";
import {main} from "./generator";

/**
 * RUN COMMAND: yarn metrics:generate
 */

let dbConn: Connection

const getDatabase = async () => {
  if (!dbConn) {
    dbConn = await connectDatabase();
  }
  return dbConn;
}

(async () => {
  console.log('CONNECTING TO DATABASE');
  const connection = await getDatabase();
  try {
    await main();
    console.log('CLOSING CONNECTION')
    await connection.close();
    process.exit(0);
  } catch (e) {
    console.log('SCRIPT ERROR: ', e.message);
    await Participant.query('TRUNCATE public.participant CASCADE');
    await Campaign.query('TRUNCATE public.campaign CASCADE');
    await Wallet.query('TRUNCATE public.wallet CASCADE');
    await User.query('TRUNCATE public.user CASCADE');
    await Org.query('TRUNCATE public.org CASCADE');
  }
})();
