// import { expect } from "chai";
// import { createSandbox } from "sinon";
// import { Transfer } from "../../src/models/Transfer";
// import { Participant } from "../../src/models/Participant";
// import { Campaign } from "../../src/models/Campaign";
// import { Wallet } from "../../src/models/Wallet";
// import { Profile } from "../../src/models/Profile";
// import { NotificationSettings } from "../../src/models/NotificationSettings";
// import { User } from "../../src/models/User";
// import { QualityScore } from "../../src/models/QualityScore";
// import { Application } from "../../src/app";
// import { Dragonchain } from "../../src/clients/dragonchain";
// import { Firebase } from "../../src/clients/firebase";
// import { Paypal } from "../../src/clients/paypal";
// import * as admin from "firebase-admin";
// import {
//     createCampaign,
//     createParticipant,
//     createSocialLink,
//     createSocialPost,
//     createUser,
//     generateParticipation,
// } from "../integration/specHelpers";
// import { EngagementRate } from "../../src/cron/qualityScore/EngagementRate";
// import { BN } from "../../src/util";
// import { StandardDeviation } from "../../src/cron/qualityScore/StandardDeviation";
// import * as cron from "../../src/cron/qualityScore/qualityScore";

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
//     await QualityScore.query("TRUNCATE public.quality_score CASCADE");
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

// describe("#unit Quality Score cron", () => {
//     let runningApp: Application;
//     before(async () => {
//         setEnv();
//         fullAppSandbox.stub(Dragonchain, "initialize");
//         fullAppSandbox.stub(Firebase, "initialize");
//         fullAppSandbox.stub(Paypal, "initialize");
//         fullAppSandbox.stub(Paypal, "refreshToken");
//         Firebase.client = {
//             auth: () => {},
//         } as admin.app.App;
//         runningApp = new Application();
//         await runningApp.initializeServer();
//         await runningApp.startServer();
//     });
//     after(async () => {
//         fullAppSandbox.restore();
//         await runningApp.databaseConnection.close();
//         await runningApp.runningServer.close();
//     });

//     afterEach(async () => {
//         await clearDB();
//         sandbox.restore();
//     });

//     it("should calculate participant engagement rate", async () => {
//         const campaign = await createCampaign(runningApp);
//         const user = await createUser(runningApp);
//         await createSocialLink(runningApp, { user, followerCount: 100 });
//         const participant = await createParticipant(runningApp, {
//             user,
//             campaign,
//             clickCount: 95,
//             viewCount: 50,
//             submissionCount: 75,
//         });
//         await createSocialPost(runningApp, {
//             likes: 10,
//             shares: 30,
//             comments: 50,
//             participantId: participant.id,
//             user,
//             campaign,
//         });
//         await createSocialPost(runningApp, {
//             likes: 80,
//             shares: 40,
//             comments: 10,
//             participantId: participant.id,
//             user,
//             campaign,
//         });
//         await createSocialPost(runningApp, {
//             likes: 60,
//             shares: 100,
//             comments: 90,
//             participantId: participant.id,
//             user,
//             campaign,
//         });
//         const c = await Campaign.findOneOrFail({ where: { id: campaign.id }, relations: ["participants", "posts"] });
//         const { likeRate, commentRate, shareRate, clickRate } = await new EngagementRate(c.participants[0], c).social();
//         const viewRate = new EngagementRate(c.participants[0], c).views();
//         const submissionRate = new EngagementRate(c.participants[0], c).submissions();
//         expect(likeRate.toString()).to.equal("0.5");
//         expect(commentRate.toString()).to.equal("0.5");
//         expect(shareRate.toString()).to.equal("0.56666666666666666667");
//         expect(clickRate.toString()).to.equal("0.31666666666666666667");
//         expect(viewRate.toString()).to.equal("1.9");
//         expect(submissionRate.toString()).to.equal("1.26666666666666666667");
//     });
//     it("should calculate standard deviation", async () => {
//         const nums = [new BN(20), new BN(45), new BN(65), new BN(38.6), new BN(3.6143)];
//         const { standardDeviation, average } = new StandardDeviation(nums).calculate();
//         expect(standardDeviation.toString()).to.equal("21.07828332474919552361");
//         expect(average.toString()).to.equal("34.44286");
//     });
//     it("should calculate quality score and catch outlier", async () => {
//         const campaign = await createCampaign(runningApp);
//         await generateParticipation(runningApp, campaign);
//         await generateParticipation(runningApp, campaign);
//         await generateParticipation(runningApp, campaign);
//         await generateParticipation(runningApp, campaign);
//         await generateParticipation(runningApp, campaign);
//         await generateParticipation(runningApp, campaign);
//         const participantId = await generateParticipation(runningApp, campaign, true);
//         await generateParticipation(runningApp, campaign);
//         await generateParticipation(runningApp, campaign);
//         await generateParticipation(runningApp, campaign);
//         await generateParticipation(runningApp, campaign);
//         await generateParticipation(runningApp, campaign);
//         await generateParticipation(runningApp, campaign);
//         await generateParticipation(runningApp, campaign);
//         await cron.main();
//         const qualityScore = await QualityScore.findOneOrFail({ where: { participantId } });
//         expect(qualityScore.likes.toString()).to.equal("1");
//         expect(qualityScore.views.toString()).to.equal("1");
//         expect(qualityScore.clicks.toString()).to.equal("1");
//         expect(qualityScore.submissions.toString()).to.equal("1");
//         expect(qualityScore.shares.toString()).to.equal("1");
//         expect(qualityScore.comments.toString()).to.equal("1");
//     });
// });
