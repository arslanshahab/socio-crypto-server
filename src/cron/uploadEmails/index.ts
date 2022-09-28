import { S3Client } from "../../clients/s3";
import { UserService } from "../../services/UserService";

const userService = new UserService();

(async () => {
    if (process.env.NODE_ENV === "production") await S3Client.uploadUserEmails(await userService.getAllEmails());
})();
