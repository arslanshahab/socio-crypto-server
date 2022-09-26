// import { createSandbox, assert } from "sinon"; // , SinonStub
// import { expect } from "chai";
// import * as admin from "firebase-admin";
// import { Application } from "../../src/app";
// import { Dragonchain } from "../../src/clients/dragonchain";
// import { Firebase } from "../../src/clients/firebase";
// import { Paypal } from "../../src/clients/paypal";
// import { Participant } from "../../src/models/Participant";
// import { Transfer } from "../../src/models/Transfer";
// import { Campaign } from "../../src/models/Campaign";
// import { Wallet } from "../../src/models/Wallet";
// import { User } from "../../src/models/User";
// import { Profile } from "../../src/models/Profile";
// import { NotificationSettings } from "../../src/models/NotificationSettings";
// import * as cron from "../../src/cron/scoreAggregate/scoreAggregate";
// import { TwentyFourHourMetric } from "../../src/models/TwentyFourHourMetric";
// import {
//     createCampaign,
//     createNotificationSettings,
//     createParticipant,
//     createProfile,
//     createUser,
//     createDailyMetrics,
// } from "../integration/specHelpers";
// import { BN } from "../../src/util";

// const fullAppSandbox = createSandbox();
// const sandbox = createSandbox();

// const clearDB = async () => {
//     await Transfer.query("TRUNCATE public.transfer CASCADE");
//     await Participant.query("TRUNCATE public.participant CASCADE");
//     await Campaign.query("TRUNCATE public.campaign CASCADE");
//     await Wallet.query("TRUNCATE public.wallet CASCADE");
//     await Profile.query("TRUNCATE public.profile CASCADE");
//     await NotificationSettings.query("TRUNCATE public.notification_settings CASCADE");
//     await User.query("TRUNCATE public.user CASCADE");
// };

// const setEnv = () => {
//     process.env.BEARER_TOKEN = "banana";
//     process.env.DRAGONCHAIN_ID = "bogusId";
//     process.env.DRAGONCHAIN_ENDPOINT = "https://bogusDragonchainEndpoint.com";
//     process.env.DRAGONCHAIN_API_KEY_ID = "bogusApiKeyId";
//     process.env.DRAGONCHAIN_API_KEY = "bogusApiKey";
//     process.env.ENCRYPTION_KEY = "bogusEncryptionKey";
//     process.env.TWITTER_CONSUMER_KEY = "fakeTwitter";
//     process.env.TWITTER_CONSUMER_SECRET_KEY = "fakeTwitter";
//     process.env.PAYPAL_CLIENT_ID = "dummyKey";
//     process.env.PAYPAL_CLIENT_SECRET = "dummyKey";
//     process.env.FACTOR_PROVIDER_PRIVATE_KEY = "privKey";
//     process.env.FACTOR_PROVIDER_PUBLIC_KEY = "pubKey";
//     process.env.ETH_HOT_WALLET_PRIVKEY = "ethPrivKey";
// };

// describe("#unit Score Aggregate Cron", () => {
//     describe("main function", () => {
//         let runningApp: Application;
//         before(async () => {
//             setEnv();
//             fullAppSandbox.stub(Dragonchain, "initialize");
//             fullAppSandbox.stub(Firebase, "initialize");
//             fullAppSandbox.stub(Paypal, "initialize");
//             fullAppSandbox.stub(Paypal, "refreshToken");
//             Firebase.client = {
//                 auth: () => {},
//             } as admin.app.App;
//             runningApp = new Application();
//             await runningApp.initializeServer();
//             await runningApp.startServer();
//         });

//         after(async () => {
//             fullAppSandbox.restore();
//             await runningApp.databaseConnection.close();
//             await runningApp.runningServer.close();
//         });

//         afterEach(async () => {
//             await clearDB();
//             sandbox.restore();
//         });

//         it("should set a single metric without sending notification", async () => {
//             const notificationStub = sandbox.stub(Firebase, "sendDailyParticipationUpdate");
//             const campaign = await createCampaign(runningApp);
//             const notificationSettings = await createNotificationSettings(runningApp, { campaignUpdates: false });
//             const profile = await createProfile(runningApp);
//             const user = await createUser(runningApp, { notificationSettings, profile });
//             await createParticipant(runningApp, { campaign, user });
//             await cron.main();
//             expect((await TwentyFourHourMetric.find({ where: { user } })).length).to.equal(1);
//             assert.notCalled(notificationStub);
//         });

//         it("should not send daily notification when latest daily metric is not found", async () => {
//             const notificationStub = sandbox.stub(Firebase, "sendDailyParticipationUpdate");
//             const campaign = await createCampaign(runningApp);
//             const profile = await createProfile(runningApp);
//             const user = await createUser(runningApp, { profile });
//             await createParticipant(runningApp, { campaign, user });
//             await cron.main();
//             assert.notCalled(notificationStub);
//         });

//         it("should send the notification", async () => {
//             const notificationStub = sandbox.stub(Firebase, "sendDailyParticipationUpdate");
//             const campaign = await createCampaign(runningApp);
//             const profile = await createProfile(runningApp);
//             const user = await createUser(runningApp, { profile });
//             await createParticipant(runningApp, { campaign, user });
//             await createDailyMetrics(runningApp, {
//                 campaign,
//                 user,
//                 participationScore: new BN(10),
//                 totalParticipationScore: new BN(10),
//             });
//             await cron.main();
//             assert.calledOnce(notificationStub);
//         });
//     });
// });
