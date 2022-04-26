import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { Secrets } from "../../src/util/secrets";
import { User } from "../../src/models/User";
import { createObjectCsvWriter } from "csv-writer";

dotenv.config();

(async () => {
    try {
        console.log("Preparing to fetch user list.");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const users = await User.find({ relations: ["profile"] });
        const csvData = [];
        const csvWriter = createObjectCsvWriter({
            path: "user-list.csv",
            header: [
                { id: "userId", title: "userId" },
                { id: "username", title: "username" },
                { id: "email", title: "email" },
                { id: "createdAt", title: "createdAt" },
                { id: "lastLogin", title: "lastLogin" },
            ],
        });
        for (const user of users) {
            csvData.push({
                userId: user.id,
                username: user?.profile?.username || "",
                email: user.email,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
            });
        }
        await csvWriter.writeRecords(csvData);
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
