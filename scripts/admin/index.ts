import {Secrets} from "../../src/util/secrets";
import {Firebase} from "../../src/clients/firebase";
import {Connection} from "typeorm";
import {connectDatabase} from "../metrics/helpers";
import {addAccountToOrg, addAddress, addCurrencyToOrgWallet, addSupportedCurrency, createNewOrg, patchRaysAccount} from "./actions";

const ACTION = process.env.ACTION || 'patchAccount';
let dbConn: Connection

const getDatabase = async () => {
  if(ACTION == 'patchAccount') return
  if (!dbConn) {
    dbConn = await connectDatabase();
  }
  return dbConn;
}

(async () => {
  const connection = await getDatabase();
  try {
    console.log('CONNECTING TO DATABASE');
    await Secrets.initialize();
    await Firebase.initialize();
    switch (ACTION) {
      case 'createNewOrg':
        console.log('CREATING NEW ORG')
        await createNewOrg();
        break;
      case 'addAccountToOrg':
        console.log('ADDING ACCOUNT TO ORG')
        await addAccountToOrg();
        break;
      case 'addCurrencyToOrgWallet':
        console.log('ADDING CURRENCY TO ORG WALLET')
        await addCurrencyToOrgWallet();
        break;
      case 'registerCryptoCurrency':
        console.log('REGISTERING NEW CRYPTO CURRENCY')
        await addSupportedCurrency();
        break;
      case 'addAddress':
        console.log('ADDING EXTERNAL ADDRESS')
        await addAddress();
        break
      case 'patchAccount':
        await patchRaysAccount();
        break
      default:
        throw new Error('invalid action');
    }
    console.log('CLOSING CONNECTION');
    if (connection) await connection.close();
    process.exit(0);
  } catch (e) {
    console.log('ERROR', e)
    console.log('CLOSING CONNECTION')
    if (connection) await connection.close();
    process.exit(0);
  }
})();
