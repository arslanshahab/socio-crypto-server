import {Firebase} from "../src/clients/firebase";
import {Secrets} from "../src/util/secrets";


const actions = ['updateClaims']

const ACTION = actions[0];
const FIREBASE_ID = '';

(async () => {
  try {
    await Secrets.initialize();
    await Firebase.initialize();
    switch (ACTION) {
      case 'updateClaims':
        await Firebase.setCustomUserClaims(FIREBASE_ID, 'raiinmaker', 'admin', false);
    }
    console.log('firebase action successful');
    console.log('shutting down');
    process.exit(0);
  } catch (e) {
      console.log('script error: ', e);
  }
})();
