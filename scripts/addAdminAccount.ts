import {Firebase} from "../src/clients/firebase";
import {Admin} from "../src/models/Admin";
import {FundingWallet} from "../src/models/FundingWallet";
import {Org} from "../src/models/Org";
import {Secrets} from "../src/util/secrets";
import {connectDatabase} from "./helpers";
import {Connection} from "typeorm";

const NAME = process.env.NAME || 'developer';
const EMAIL = process.env.EMAIL || 'testing@raiinmaker.com';
const PASSWORD = process.env.PASSWORD || 'raiinmaker';
const ORG_NAME = process.env.ORG_NAME || 'raiinmaker';
const ACTION = process.env.ACTION || 'create';
const TEMP_PASSWORD = false;

let dbConn: Connection

const getDatabase = async () => {
  if (!dbConn) {
    dbConn = await connectDatabase();
  }
  return dbConn;
}

const handleError = async (e: any, connection: Connection) => {
  console.log('ERROR', e)
  console.log('CLOSING CONNECTION')
  await connection.close();
  process.exit(0);
}

const createNewOrg = async (connection: Connection) => {
  try {
    console.log('Initializing new Org')
    let user;
    try {
      user = await Firebase.createNewUser(EMAIL, PASSWORD);
    } catch (e) {
      user = await Firebase.getUser(EMAIL);
    }
    await Firebase.setCustomUserClaims(user.uid, ORG_NAME, 'admin', TEMP_PASSWORD);
    const org = Org.newOrg(ORG_NAME);
    await org.save();
    const admin = new Admin();
    admin.firebaseId = user.uid;
    admin.org = org;
    admin.name = NAME;
    await admin.save();
    const fundingWallet = new FundingWallet();
    fundingWallet.org = org;
    await fundingWallet.save();
    console.log('CLOSING CONNECTION')
    await connection.close();
    process.exit(0);
  } catch (e) {
    await handleError(e, connection)
  }
}

const addAccountToOrg = async (connection: Connection) => {
  try {
    console.log('Adding account to existing org');
    let user;
    try {
      user = await Firebase.createNewUser(EMAIL, PASSWORD);
    } catch (e) {
      user = await Firebase.getUser(EMAIL);
    }
    await Firebase.setCustomUserClaims(user.uid, ORG_NAME, 'admin', TEMP_PASSWORD);
    const org = await Org.findOne({where: {name: ORG_NAME}});
    if (!org) throw new Error('org not found');
    const admin = new Admin();
    admin.firebaseId = user.uid;
    admin.org = org;
    admin.name = NAME;
    await admin.save();
    console.log('CLOSING CONNECTION')
    await connection.close();
    process.exit(0);
  } catch (e) {
    await handleError(e, connection)
  }

}
(async () => {
  const connection = await getDatabase();
    console.log('CONNECTING TO DATABASE');
    await Secrets.initialize();
    await Firebase.initialize();
    if(ACTION === 'create') await createNewOrg(connection);
    else await addAccountToOrg(connection);
})();
