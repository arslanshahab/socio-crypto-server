import { Connection } from "typeorm";
import { prisma, readPrisma } from "../../src/clients/prisma";
import { getSocialClient } from "../../src/controllers/helpers";
import { SocialClientType } from "../../src/util/constants";
import { decrypt } from "../../src/util/crypto";
import { Secrets } from "../../src/util/secrets";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";

dotenv.config();

(async () => {
    try {
        console.log("Preparing to update username in social link table.");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const socialLinks = await readPrisma.socialLink.findMany({ where: { username: null } });
        for (const socialLink of socialLinks) {
            let username: string = "";
            const client = getSocialClient(SocialClientType.TWITTER);
            if (socialLink?.apiKey && socialLink?.apiSecret) {
                username = await client.getUsernameV2({
                    apiKey: decrypt(socialLink.apiKey),
                    apiSecret: decrypt(socialLink.apiSecret),
                });
            }
            await prisma.socialLink.update({ where: { id: socialLink.id }, data: { username } });
        }
        await connection.close();
        process.exit(0);
    } catch (error) {
        console.log("ERROR:?", error);
    }
})();
