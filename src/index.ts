import { Application } from "./app";

(async () => {
    const application = new Application();
    await application.initializeServer();
    await application.startServer();
})();
