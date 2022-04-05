import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { Secrets } from "../../src/util/secrets";
import { Campaign } from "../../src/models/Campaign";
import { Participant } from "../../src/models/Participant";
import { Wallet } from "../../src/models/Wallet";
import { TatumClient } from "../../src/clients/tatumClient";
import { MATIC } from "../../src/util/constants";
dotenv.config();

(async () => {
    try {
        console.log("Starting coiin migration to tatum");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const participants = await Participant.find({
            where: { campaign: await Campaign.findOne({ where: { id: "cc16fe02-3534-4053-811f-9a7491ad3144" } }) },
            relations: ["campaign", "user"],
        });

        for (let index = 0; index < participants.length; index++) {
            const participant = participants[index];
            console.log("created tatum account for this participant --- ", participant.id);
            const wallet = await Wallet.findOne({ where: { user: participant.user } });
            if (!wallet) throw new Error("User wallet not found.");
            await TatumClient.findOrCreateCurrency({ symbol: MATIC, network: MATIC, wallet: wallet });
        }
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
