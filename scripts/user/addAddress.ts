import {Profile} from "../../src/models/Profile";
import {ExternalAddress} from "../../src/models/ExternalAddress";
import {Connection} from "typeorm";
import {connectDatabase} from "../helpers";
import * as dotenv from "dotenv";
dotenv.config();

const username = 'raiinmaker-3802732';
const ethereumAddress = '0xc0afDf9c92d6623a95f04f033b48c8078AA1B3c7';
let dbConn: Connection

const getDatabase = async () => {
  if (!dbConn) {
    dbConn = await connectDatabase();
  }
  return dbConn;
}

(async () => {
  try {
    console.log('CONNECTING TO DATABASE')
    const connection = await getDatabase();
    const profile = await Profile.findOne({where: {username}, relations:['user', 'user.wallet']});
    if (!profile) throw new Error('profile not found');
    const address = new ExternalAddress();
    address.ethereumAddress = ethereumAddress.toLowerCase();
    address.claimed = true;
    address.claimMessage = 'bacon';
    address.user = profile.user;
    address.wallet = profile.user.wallet;
    console.log('SAVING NEW ADDRESS', address)
    await address.save();
    console.log('CLOSING CONNECTION');
    if (connection) await connection.close();
    process.exit(0);
  } catch (e) {
    console.log('ERROR:', e);
  }
})();
