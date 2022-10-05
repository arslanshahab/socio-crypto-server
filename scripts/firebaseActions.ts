import { FirebaseAdmin } from "../src/clients/firebaseAdmin";
import { Secrets } from "../src/util/secrets";
import * as dotenv from "dotenv";
dotenv.config();

const actions = ["updateClaims"];

const ACTION = actions[0];
const FIREBASE_ID = process.env.FIREBASE_ID || "";

(async () => {
    try {
        await Secrets.initialize();
        await FirebaseAdmin.initialize();
        switch (ACTION) {
            case "updateClaims":
                await FirebaseAdmin.setCustomUserClaims(FIREBASE_ID, "raiinmaker", "admin", false);
        }
        console.log("firebase action successful");
        console.log("shutting down");
        process.exit(0);
    } catch (e) {
        console.log("script error: ", e);
    }
})();
