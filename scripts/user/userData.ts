import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { Secrets } from "../../src/util/secrets";
import { SocialLink } from "../../src/models/SocialLink";
import { TwitterClient } from "../../src/clients/twitter";
import { User } from "../../src/models/User";
dotenv.config();

(async () => {
    try {
        console.log("Preparing to fetch user data.");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const email = "kimseong1404@gmail.com";
        const user = await User.findOne({ where: { email } });
        if (!user) throw new Error("USer not found.");
        const socialLink = await SocialLink.findOne({ where: { user, type: "twitter" } });
        if (!socialLink) throw new Error("Social link not found for user");
        const twitterUsername = await TwitterClient.getUsername(socialLink);
        console.log({
            id: user.id,
            email: user.email,
            twitterUsername,
        });
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
