import { S3Client } from "../../clients/s3";
import { UserService } from "../../services/UserService";
import * as dotenv from "dotenv";

const userService = new UserService();
dotenv.config();
(async () => {
    if (process.env.NODE_ENV === "production") await S3Client.uploadUserEmails(await userService.getLastHourEmails());
})();
