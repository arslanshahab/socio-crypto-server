// import { expect } from "chai";
// import { createSandbox } from "sinon";
// import request from "supertest";
// import { Application } from "../../src/app";
// import { Dragonchain } from "../../src/clients/dragonchain";
// import { Participant } from "../../src/models/Participant";
// import { Campaign } from "../../src/models/Campaign";
// import { Wallet } from "../../src/models/Wallet";
// import * as RedisClient from "../../src/clients/redis";
// import {
//     clearDB,
//     createAdmin,
//     createCampaign,
//     createCrypto,
//     createOrg,
//     createParticipant,
//     createRafflePrize,
//     createUser,
//     createWalletCurrency,
//     getBeginDate,
//     getEndDate,
// } from "./specHelpers";
// import * as gql from "gql-query-builder";
// import { Firebase } from "../../src/clients/firebase";
// import * as admin from "firebase-admin";
// import { calculateTier, updateOrgCampaignsStatusOnDeposit } from "../../src/controllers/helpers";
// import { BN } from "../../src/util";
// import { Paypal } from "../../src/clients/paypal";
// import { SesClient } from "../../src/clients/ses";
// import { encrypt } from "../../src/util/crypto";
// import { WalletCurrency } from "../../src/models/WalletCurrency";

// describe("Campaign Integration Test", () => {
//     let runningApp: Application;
//     const fullAppTestBed = createSandbox();

//     const setEnv = () => {
//         process.env.BEARER_TOKEN = "banana";
//         process.env.DRAGONCHAIN_ID = "bogusId";
//         process.env.DRAGONCHAIN_ENDPOINT = "https://bogusDragonchainEndpoint.com";
//         process.env.DRAGONCHAIN_API_KEY_ID = "bogusApiKeyId";
//         process.env.DRAGONCHAIN_API_KEY = "bogusApiKey";
//         process.env.ENCRYPTION_KEY = "bogusEncryptionKey";
//         process.env.TWITTER_CONSUMER_KEY = "fakeTwitter";
//         process.env.TWITTER_CONSUMER_SECRET_KEY = "fakeTwitter";
//         process.env.PAYPAL_CLIENT_ID = "dummyKey";
//         process.env.PAYPAL_CLIENT_SECRET = "dummyKey";
//         process.env.FACTOR_PROVIDER_PRIVATE_KEY = "privKey";
//         process.env.FACTOR_PROVIDER_PUBLIC_KEY = "pubKey";
//         process.env.ETH_HOT_WALLET_PRIVKEY = "ethPrivKey";
//         process.env.STRIPE_API_KEY = "banana";
//         process.env.STRIPE_WEBHOOK_SECRET = "banana";
//     };

//     before(async () => {
//         setEnv();
//         fullAppTestBed.stub(Dragonchain, "initialize");
//         fullAppTestBed.stub(Firebase, "initialize");
//         fullAppTestBed.stub(Paypal, "initialize");
//         fullAppTestBed.stub(Paypal, "refreshToken");
//         fullAppTestBed.stub(Firebase, "sendCampaignCompleteNotifications");
//         fullAppTestBed.stub(Firebase, "sendCampaignCreatedNotifications");
//         fullAppTestBed.stub(SesClient, "sendRafflePrizeRedemptionEmail");
//         Firebase.client = {
//             auth: () => {},
//         } as admin.app.App;
//         fullAppTestBed.stub(Dragonchain, "ledgerCoiinCampaignAudit");
//         fullAppTestBed.stub(Dragonchain, "ledgerRaffleCampaignAudit");
//         fullAppTestBed.stub(RedisClient, "getRedis");
//         runningApp = new Application();
//         await runningApp.initializeServer();
//         await runningApp.startServer();
//     });

//     afterEach(async () => {
//         await clearDB();
//     });

//     after(async () => {
//         fullAppTestBed.restore();
//         await runningApp.databaseConnection.close();
//         await runningApp.runningServer.close();
//     });
//     describe("Mutations", () => {
//         describe("#newCampaign", () => {
//             it("#newCampaign", async () => {
//                 const org = await createOrg(runningApp);
//                 const user = await createUser(runningApp);
//                 await createAdmin(runningApp, { org, user });
//                 const cryptoCurrency = await createCrypto(runningApp);
//                 let walletCurrency = await createWalletCurrency(runningApp, {
//                     type: cryptoCurrency.type,
//                     balance: new BN(150),
//                 });
//                 org.wallet.currency.push(walletCurrency);
//                 await org.wallet.save();
//                 const beginDate = getBeginDate().toString();
//                 const endDate = getEndDate().toString();
//                 const algorithm = JSON.stringify({
//                     version: "1",
//                     initialTotal: "1000",
//                     tiers: {
//                         "1": { threshold: "25000", totalCoiins: "1000" },
//                         "2": { threshold: "50000", totalCoiins: "3000" },
//                         "3": { threshold: "75000", totalCoiins: "5000" },
//                         "4": { threshold: "100000", totalCoiins: "7000" },
//                         "5": { threshold: "250000", totalCoiins: "10000" },
//                     },
//                     pointValues: { click: "14", view: "10", submission: "201", likes: "201", shares: "201" },
//                 });
//                 const mutation = gql.mutation({
//                     operation: "newCampaign",
//                     variables: {
//                         name: { value: "banana", required: true },
//                         coiinTotal: { value: 21.24, required: true },
//                         target: { value: "bacon", required: true },
//                         cryptoId: { value: walletCurrency.id },
//                         targetVideo: { value: "bacon-video", required: true },
//                         beginDate: { value: beginDate, required: true },
//                         endDate: { value: endDate, required: true },
//                         algorithm: { value: algorithm, required: true },
//                         company: "raiinmaker",
//                     },
//                     fields: ["name"],
//                 });
//                 const res = await request(runningApp.app)
//                     .post("/v1/graphql")
//                     .send(mutation)
//                     .set("Accepts", "application/json")
//                     .set("company", "raiinmaker")
//                     .set("authorization", "Bearer raiinmaker");
//                 const response = res.body.data.newCampaign;
//                 expect(response.name).to.equal("banana");
//             });
//             it("#newCampaign - no target video", async () => {
//                 const org = await createOrg(runningApp);
//                 const user = await createUser(runningApp);
//                 await createAdmin(runningApp, { org, user });
//                 const beginDate = getBeginDate().toString();
//                 const endDate = getEndDate().toString();
//                 const algorithm = JSON.stringify({
//                     version: "1",
//                     initialTotal: "1000",
//                     tiers: {
//                         "1": { threshold: "25000", totalCoiins: "1000" },
//                         "2": { threshold: "50000", totalCoiins: "3000" },
//                         "3": { threshold: "75000", totalCoiins: "5000" },
//                         "4": { threshold: "100000", totalCoiins: "7000" },
//                         "5": { threshold: "250000", totalCoiins: "10000" },
//                     },
//                     pointValues: { click: "14", view: "10", submission: "201", likes: "201", shares: "201" },
//                 });
//                 const mutation = gql.mutation({
//                     operation: "newCampaign",
//                     variables: {
//                         name: { value: "banana", required: true },
//                         coiinTotal: { value: 21.24, required: true },
//                         target: { value: "bacon", required: true },
//                         beginDate: { value: beginDate, required: true },
//                         endDate: { value: endDate, required: true },
//                         algorithm: { value: algorithm, required: true },
//                         company: "raiinmaker",
//                     },
//                     fields: ["name"],
//                 });
//                 const res = await request(runningApp.app)
//                     .post("/v1/graphql")
//                     .send(mutation)
//                     .set("Accepts", "application/json")
//                     .set("company", "raiinmaker")
//                     .set("authorization", "Bearer raiinmaker");
//                 console.log(JSON.stringify(res.body));
//                 const response = res.body.data.newCampaign;
//                 expect(response.name).to.equal("banana");
//                 expect(response.targetVideo).to.be.undefined;
//             });
//             it("#newRaffleCampaign with raffle prize", async () => {
//                 const org = await createOrg(runningApp);
//                 const user = await createUser(runningApp);
//                 await createAdmin(runningApp, { org, user });
//                 const beginDate = getBeginDate().toString();
//                 const endDate = getEndDate().toString();
//                 const algorithm = JSON.stringify({
//                     version: "1",
//                     pointValues: { click: "14", view: "10", submission: "201", likes: "201", shares: "201" },
//                 });
//                 const mutation = gql.mutation({
//                     operation: "newCampaign",
//                     variables: {
//                         name: { value: "banana", required: true },
//                         coiinTotal: { value: 21.24, required: true },
//                         target: { value: "bacon", required: true },
//                         targetVideo: { value: "bacon-video", required: true },
//                         beginDate: { value: beginDate, required: true },
//                         endDate: { value: endDate, required: true },
//                         algorithm: { value: algorithm, required: true },
//                         company: "raiinmaker",
//                         type: "raffle",
//                         rafflePrize: { value: { displayName: "banana" }, type: "JSON" },
//                     },
//                     fields: ["id"],
//                 });
//                 const res = await request(runningApp.app)
//                     .post("/v1/graphql")
//                     .send(mutation)
//                     .set("Accepts", "application/json")
//                     .set("company", "raiinmaker")
//                     .set("authorization", "Bearer raiinmaker");
//                 const response = res.body.data.newCampaign;
//                 expect(!!response.id).to.be.true;
//                 const campaign = await Campaign.findOneOrFail({ where: { id: response.id }, relations: ["prize"] });
//                 expect(!!campaign.prize).to.be.true;
//                 expect(campaign.prize.displayName).to.equal("banana");
//             });
//         });
//         it("#calculateTier calculates correct max tier", async () => {
//             const algorithm = JSON.parse(
//                 '{"tiers": {"1": {"threshold": 0, "totalCoiins": 1000}, "2": {"threshold": 10, "totalCoiins": 2000}, "3": {"threshold": "", "totalCoiins": ""}, "4": {"threshold": "", "totalCoiins": ""}, "5": {"threshold": "", "totalCoiins": ""}, "6": {"threshold": "", "totalCoiins": ""}, "7": {"threshold": "", "totalCoiins": ""}, "8": {"threshold": "", "totalCoiins": ""}, "9": {"threshold": "", "totalCoiins": ""}, "10": {"threshold": "", "totalCoiins": ""}}, "pointValues": {"view": "1", "click": "1", "likes": "1", "shares": "1", "submission": "1"}}'
//             );
//             const { currentTier, currentTotal } = await calculateTier(new BN(30), algorithm.tiers);
//             expect(currentTier).to.equal(2);
//             expect(currentTotal).to.equal(2000);
//         });
//         it("#updateCampaign", async () => {
//             const campaign = await createCampaign(runningApp, {});
//             const mutation = gql.mutation({
//                 operation: "updateCampaign",
//                 variables: {
//                     id: { value: campaign.id, required: true },
//                     name: "bacon-campaign",
//                     coiinTotal: 2000.1,
//                 },
//                 fields: ["coiinTotal"],
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(mutation)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             expect(res.body.data.updateCampaign.coiinTotal).to.equal(2000.1);
//         });
//         it("#generateCampaignAudit", async () => {
//             const participant1 = await createParticipant(runningApp);
//             const participant2 = await createParticipant(runningApp);
//             const participant3 = await createParticipant(runningApp);
//             const campaign = await createCampaign(runningApp, {
//                 participants: [participant1, participant2, participant3],
//                 totalParticipationScore: 45,
//             });
//             const mutation = gql.mutation({
//                 operation: "generateCampaignAuditReport",
//                 variables: {
//                     campaignId: { value: campaign.id, required: true },
//                 },
//                 fields: [
//                     "totalViews",
//                     "totalClicks",
//                     "totalSubmissions",
//                     "totalRewardPayout",
//                     { flaggedParticipants: ["participantId", "totalPayout"] },
//                 ],
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(mutation)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             const response = res.body.data.generateCampaignAuditReport;
//             expect(response.totalViews).to.equal(15);
//             expect(response.totalClicks).to.equal(15);
//             expect(response.totalSubmissions).to.equal(15);
//             expect(response.totalRewardPayout).to.equal(40);
//             expect(response.flaggedParticipants.length).to.equal(3);
//         });
//         it("#generateCampaignAudit for raffle campaign", async () => {
//             const participant1 = await createParticipant(runningApp);
//             const participant2 = await createParticipant(runningApp);
//             const participant3 = await createParticipant(runningApp);
//             const campaign = await createCampaign(runningApp, {
//                 type: "raffle",
//                 participants: [participant1, participant2, participant3],
//                 totalParticipationScore: 45,
//             });
//             const mutation = gql.mutation({
//                 operation: "generateCampaignAuditReport",
//                 variables: {
//                     campaignId: { value: campaign.id, required: true },
//                 },
//                 fields: [
//                     "totalViews",
//                     "totalClicks",
//                     "totalSubmissions",
//                     "totalRewardPayout",
//                     { flaggedParticipants: ["participantId", "totalPayout"] },
//                 ],
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(mutation)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             const response = res.body.data.generateCampaignAuditReport;
//             expect(response.totalViews).to.equal(15);
//             expect(response.totalClicks).to.equal(15);
//             expect(response.totalSubmissions).to.equal(15);
//             expect(response.totalRewardPayout).to.equal(0);
//             expect(response.flaggedParticipants.length).to.equal(3);
//         });
//         it("#generateCampaignAudit for raffle campaign with only 1 flagged participant", async () => {
//             const participant1 = await createParticipant(runningApp, { participationScore: 5 });
//             const participant2 = await createParticipant(runningApp, { participationScore: 5 });
//             const participant3 = await createParticipant(runningApp, { participationScore: 35 });
//             const campaign = await createCampaign(runningApp, {
//                 type: "raffle",
//                 participants: [participant1, participant2, participant3],
//                 totalParticipationScore: 45,
//             });
//             const mutation = gql.mutation({
//                 operation: "generateCampaignAuditReport",
//                 variables: {
//                     campaignId: { value: campaign.id, required: true },
//                 },
//                 fields: [
//                     "totalViews",
//                     "totalClicks",
//                     "totalSubmissions",
//                     "totalRewardPayout",
//                     { flaggedParticipants: ["participantId", "totalPayout"] },
//                 ],
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(mutation)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             const response = res.body.data.generateCampaignAuditReport;
//             expect(response.totalViews).to.equal(15);
//             expect(response.totalClicks).to.equal(15);
//             expect(response.totalSubmissions).to.equal(15);
//             expect(response.totalRewardPayout).to.equal(0);
//             expect(response.flaggedParticipants.length).to.equal(1);
//             expect(response.flaggedParticipants[0].participantId).to.equal(participant3.id);
//         });
//         it("#payoutCampaignRewards from a raffle campaign", async () => {
//             const campaign = await createCampaign(runningApp, { type: "raffle", totalParticipationScore: 60 });
//             await createRafflePrize(runningApp, { displayName: "rafflePrize1", campaign });
//             await createParticipant(runningApp, {
//                 email: encrypt("demo@email.com"),
//                 campaign,
//                 participationScore: 20,
//             });
//             await createParticipant(runningApp, {
//                 email: encrypt("demo@email.com"),
//                 campaign,
//                 participationScore: 30,
//                 clickCount: 10,
//                 viewCount: 10,
//                 submissionCount: 10,
//             });
//             await createParticipant(runningApp, { email: encrypt("demo@email.com"), participationScore: 10, campaign });
//             const mutation = gql.mutation({
//                 operation: "payoutCampaignRewards",
//                 variables: {
//                     campaignId: { value: campaign.id, required: true },
//                     rejected: { value: [], type: "[String]", required: true },
//                 },
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(mutation)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             expect(res.body.data.payoutCampaignRewards).to.equal(true);
//             const c = await Campaign.findOneOrFail({ where: { id: campaign.id }, relations: ["payouts"] });
//             expect(c.payouts.length).to.equal(1);
//             expect(c.payouts[0].action).to.equal("prize");
//         });
//         it("#payoutCampaignRewards from a raffle campaign with 1 flagged participant", async () => {
//             const campaign = await createCampaign(runningApp, { type: "raffle", totalParticipationScore: 60 });
//             await createRafflePrize(runningApp, { displayName: "rafflePrize1", campaign });
//             const participant = await createParticipant(runningApp, {
//                 campaign,
//                 participationScore: 20,
//             });
//             await createParticipant(runningApp, {
//                 campaign,
//                 participationScore: 30,
//                 clickCount: 10,
//                 viewCount: 10,
//                 submissionCount: 10,
//             });
//             await createParticipant(runningApp, { participationScore: 10, campaign });
//             const mutation = gql.mutation({
//                 operation: "payoutCampaignRewards",
//                 variables: {
//                     campaignId: { value: campaign.id, required: true },
//                     rejected: { value: [participant.id], type: "[String]", required: true },
//                 },
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(mutation)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             expect(res.body.data.payoutCampaignRewards).to.equal(true);
//             const c = await Campaign.findOneOrFail({ where: { id: campaign.id }, relations: ["payouts"] });
//             expect(c.payouts.length).to.equal(1);
//             expect(c.payouts[0].action).to.equal("prize");
//         });
//         it("#payoutCampaignRewards", async () => {
//             await createOrg(runningApp);
//             const org = await createOrg(runningApp, { name: "banana" });
//             const campaign = await createCampaign(runningApp, {
//                 totalParticipationScore: 60,
//                 org,
//                 status: "INSUFFICIENT_FUNDS",
//             });
//             let walletCurrency = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(150),
//             });
//             let walletCurrency1 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50),
//             });
//             let walletCurrency2 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50),
//             });
//             let walletCurrency3 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50),
//             });
//             org.wallet.currency.push(walletCurrency);
//             await org.wallet.save();
//             await updateOrgCampaignsStatusOnDeposit(org.wallet);
//             let participant1 = await createParticipant(runningApp, {
//                 campaign,
//                 userOptions: {
//                     walletOptions: {
//                         currency: [walletCurrency1],
//                     },
//                 },
//             });
//             let participant2 = await createParticipant(runningApp, {
//                 campaign,
//                 participationScore: 30,
//                 clickCount: 10,
//                 viewCount: 10,
//                 submissionCount: 10,
//                 userOptions: {
//                     walletOptions: {
//                         currency: [walletCurrency2],
//                     },
//                 },
//             });
//             let participant3 = await createParticipant(runningApp, {
//                 campaign,
//                 userOptions: { walletOptions: { currency: [walletCurrency3] } },
//             });
//             const mutation = gql.mutation({
//                 operation: "payoutCampaignRewards",
//                 variables: {
//                     campaignId: { value: campaign.id, required: true },
//                     rejected: { value: [], type: "[String]", required: true },
//                 },
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(mutation)
//                 .set("Accepts", "application/json")
//                 .set("company", "raiinmaker")
//                 .set("authorization", "Bearer raiinmaker");
//             participant1 = await Participant.findOneOrFail({ id: participant1.id });
//             participant2 = await Participant.findOneOrFail({ id: participant2.id });
//             participant3 = await Participant.findOneOrFail({ id: participant3.id });
//             const response = res.body.data.payoutCampaignRewards;
//             expect(response).to.be.true;
//             const wallet1 = await Wallet.findOneOrFail({ where: { user: participant1.user.id }, relations: ["user"] });
//             const wallet2 = await Wallet.findOneOrFail({ where: { user: participant2.user.id }, relations: ["user"] });
//             const wallet3 = await Wallet.findOneOrFail({ where: { user: participant3.user.id }, relations: ["user"] });
//             walletCurrency1 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet1);
//             walletCurrency2 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet2);
//             walletCurrency3 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet3);
//             expect(parseFloat(walletCurrency1.balance.minus(new BN(50)).toString())).to.equal(12.5 * 0.9);
//             expect(parseFloat(walletCurrency2.balance.minus(new BN(50)).toString())).to.equal(25 * 0.9);
//             expect(parseFloat(walletCurrency3.balance.minus(new BN(50)).toString())).to.equal(12.5 * 0.9);
//             const fundingWallet = await Wallet.findOneOrFail({
//                 where: { id: campaign.org.wallet.id },
//                 relations: ["currency"],
//             });
//             walletCurrency = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, fundingWallet);
//             expect(walletCurrency.balance.toString()).to.equal(new BN(100).toString());
//         });
//         it("#payoutCampaignRewards with float values", async () => {
//             const algorithm = {
//                 tiers: {
//                     1: {
//                         threshold: 10.5,
//                         totalCoiins: 10.5,
//                     },
//                     2: {
//                         threshold: 20.5,
//                         totalCoiins: 20.5,
//                     },
//                     3: {
//                         threshold: 30.5,
//                         totalCoiins: 30.5,
//                     },
//                     4: {
//                         threshold: 40.5,
//                         totalCoiins: 40.5,
//                     },
//                     5: {
//                         threshold: 50.5,
//                         totalCoiins: 50.5,
//                     },
//                 },
//             };
//             await createOrg(runningApp);
//             const org = await createOrg(runningApp, { name: "banana" });
//             const campaign = await createCampaign(runningApp, {
//                 totalParticipationScore: 94.5,
//                 algorithm,
//                 org,
//                 status: "INSUFFICIENT_FUNDS",
//             });
//             let walletCurrency = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(150),
//             });
//             let walletCurrency1 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50.5),
//             });
//             let walletCurrency2 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50.5),
//             });
//             let walletCurrency3 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50.5),
//             });
//             org.wallet.currency.push(walletCurrency);
//             await org.wallet.save();
//             await updateOrgCampaignsStatusOnDeposit(org.wallet);
//             let participant1 = await createParticipant(runningApp, {
//                 campaign,
//                 participationScore: 31.5,
//                 clickCount: 10.5,
//                 viewCount: 10.5,
//                 submissionCount: 10.5,
//                 userOptions: {
//                     walletOptions: {
//                         currency: [walletCurrency1],
//                     },
//                 },
//             });
//             let participant2 = await createParticipant(runningApp, {
//                 campaign,
//                 participationScore: 31.5,
//                 clickCount: 10.5,
//                 viewCount: 10.5,
//                 submissionCount: 10.5,
//                 userOptions: {
//                     walletOptions: {
//                         currency: [walletCurrency2],
//                     },
//                 },
//             });
//             let participant3 = await createParticipant(runningApp, {
//                 campaign,
//                 participationScore: 31.5,
//                 clickCount: 10.5,
//                 viewCount: 10.5,
//                 submissionCount: 10.5,
//                 userOptions: {
//                     walletOptions: {
//                         currency: [walletCurrency3],
//                     },
//                 },
//             });
//             const mutation = gql.mutation({
//                 operation: "payoutCampaignRewards",
//                 variables: {
//                     campaignId: { value: campaign.id, required: true },
//                     rejected: { value: [], type: "[String]", required: true },
//                 },
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(mutation)
//                 .set("Accepts", "application/json")
//                 .set("company", "raiinmaker")
//                 .set("authorization", "Bearer raiinmaker");
//             participant1 = await Participant.findOneOrFail({ id: participant1.id });
//             participant2 = await Participant.findOneOrFail({ id: participant2.id });
//             participant3 = await Participant.findOneOrFail({ id: participant3.id });
//             const response = res.body.data.payoutCampaignRewards;
//             expect(response).to.be.true;
//             const wallet1 = await Wallet.findOneOrFail({ where: { user: participant1.user.id }, relations: ["user"] });
//             const wallet2 = await Wallet.findOneOrFail({ where: { user: participant2.user.id }, relations: ["user"] });
//             const wallet3 = await Wallet.findOneOrFail({ where: { user: participant3.user.id }, relations: ["user"] });
//             walletCurrency1 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet1);
//             walletCurrency2 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet2);
//             walletCurrency3 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet3);
//             expect(parseFloat(walletCurrency1.balance.minus(new BN(50.5)).toString())).to.equal(15.15); // 16.833333333333 * 0.9
//             expect(parseFloat(walletCurrency2.balance.minus(new BN(50.5)).toString())).to.equal(15.15); // 16.833333333333 * 0.9
//             expect(parseFloat(walletCurrency3.balance.minus(new BN(50.5)).toString())).to.equal(15.15); // 16.833333333333 * 0.9
//         });
//         it("#payoutCampaignRewards with 0 total participation", async () => {
//             await createOrg(runningApp);
//             const org = await createOrg(runningApp, { name: "banana" });
//             const campaign = await createCampaign(runningApp, {
//                 org,
//                 totalParticipationScore: 0,
//                 status: "INSUFFICIENT_FUNDS",
//             });
//             let walletCurrency = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(150),
//             });
//             let walletCurrency1 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50),
//             });
//             let walletCurrency2 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50),
//             });
//             let walletCurrency3 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50),
//             });
//             org.wallet.currency.push(walletCurrency);
//             await org.wallet.save();
//             await updateOrgCampaignsStatusOnDeposit(org.wallet);
//             let participant1 = await createParticipant(runningApp, {
//                 campaign,
//                 participationScore: 0,
//                 clickCount: 0,
//                 viewCount: 0,
//                 submissionCount: 0,
//                 userOptions: {
//                     walletOptions: {
//                         currency: [walletCurrency1],
//                     },
//                 },
//             });
//             let participant2 = await createParticipant(runningApp, {
//                 campaign,
//                 participationScore: 0,
//                 clickCount: 0,
//                 viewCount: 0,
//                 submissionCount: 0,
//                 userOptions: {
//                     walletOptions: {
//                         currency: [walletCurrency2],
//                     },
//                 },
//             });
//             let participant3 = await createParticipant(runningApp, {
//                 campaign,
//                 participationScore: 0,
//                 clickCount: 0,
//                 viewCount: 0,
//                 submissionCount: 0,
//                 userOptions: { walletOptions: { currency: [walletCurrency3] } },
//             });
//             const mutation = gql.mutation({
//                 operation: "payoutCampaignRewards",
//                 variables: {
//                     campaignId: { value: campaign.id, required: true },
//                     rejected: { value: [], type: "[String]", required: true },
//                 },
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(mutation)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             console.log(JSON.stringify(res.body));
//             participant1 = await Participant.findOneOrFail({ id: participant1.id });
//             participant2 = await Participant.findOneOrFail({ id: participant2.id });
//             participant3 = await Participant.findOneOrFail({ id: participant3.id });
//             const response = res.body.data.payoutCampaignRewards;
//             expect(response).to.be.true;
//             const wallet1 = await Wallet.findOneOrFail({ where: { user: participant1.user.id }, relations: ["user"] });
//             const wallet2 = await Wallet.findOneOrFail({ where: { user: participant2.user.id }, relations: ["user"] });
//             const wallet3 = await Wallet.findOneOrFail({ where: { user: participant3.user.id }, relations: ["user"] });
//             walletCurrency1 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet1);
//             walletCurrency2 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet2);
//             walletCurrency3 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet3);
//             expect(parseFloat(walletCurrency1.balance.toString())).to.equal(50);
//             expect(parseFloat(walletCurrency2.balance.toString())).to.equal(50);
//             expect(parseFloat(walletCurrency3.balance.toString())).to.equal(50);
//         });
//         it("#payoutCampaignRewards with rejected participants", async () => {
//             const org = await createOrg(runningApp);
//             const campaign = await createCampaign(runningApp, { org, status: "INSUFFICIENT_FUNDS" });
//             let walletCurrency = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(150),
//             });
//             let walletCurrency1 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50),
//             });
//             let walletCurrency2 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50),
//             });
//             let walletCurrency3 = await createWalletCurrency(runningApp, {
//                 type: campaign.crypto.type,
//                 balance: new BN(50),
//             });
//             org.wallet.currency.push(walletCurrency);
//             await org.wallet.save();
//             await updateOrgCampaignsStatusOnDeposit(org.wallet);
//             let participant1 = await createParticipant(runningApp, {
//                 campaign,
//                 userOptions: {
//                     walletOptions: {
//                         currency: [walletCurrency1],
//                     },
//                 },
//             });
//             let participant2 = await createParticipant(runningApp, {
//                 campaign,
//                 userOptions: {
//                     walletOptions: {
//                         currency: [walletCurrency2],
//                     },
//                 },
//             });
//             let participant3 = await createParticipant(runningApp, {
//                 campaign,
//                 userOptions: { walletOptions: { currency: [walletCurrency3] } },
//             });
//             const mutation = gql.mutation({
//                 operation: "payoutCampaignRewards",
//                 variables: {
//                     campaignId: { value: campaign.id, required: true },
//                     rejected: { value: [participant1.id], type: "[String]", required: true },
//                 },
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(mutation)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             participant1 = await Participant.findOneOrFail({ id: participant1.id });
//             participant2 = await Participant.findOneOrFail({ id: participant2.id });
//             participant3 = await Participant.findOneOrFail({ id: participant3.id });
//             const response = res.body.data.payoutCampaignRewards;
//             expect(response).to.be.true;
//             const wallet1 = await Wallet.findOneOrFail({ where: { user: participant1.user.id }, relations: ["user"] });
//             const wallet2 = await Wallet.findOneOrFail({ where: { user: participant2.user.id }, relations: ["user"] });
//             const wallet3 = await Wallet.findOneOrFail({ where: { user: participant3.user.id }, relations: ["user"] });
//             walletCurrency1 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet1);
//             walletCurrency2 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet2);
//             walletCurrency3 = await WalletCurrency.getFundingWalletCurrency(campaign.crypto.type, wallet3);
//             expect(parseFloat(walletCurrency1.balance.minus(50).toString())).to.equal(0);
//             expect(parseFloat(walletCurrency2.balance.minus(50).toString())).to.equal(20 * 0.9);
//             expect(parseFloat(walletCurrency3.balance.minus(50).toString())).to.equal(20 * 0.9);
//         });
//         it("#deleteCampaign", async () => {
//             const campaign = await createCampaign(runningApp);
//             const mutation = gql.mutation({
//                 operation: "deleteCampaign",
//                 variables: {
//                     id: { value: campaign.id, required: true },
//                 },
//                 fields: ["name"],
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(mutation)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             const response = res.body.data.deleteCampaign;
//             expect(response.name).to.equal("bananaCampaign");
//             expect(await Campaign.findOne({ where: { name: response.name } })).to.be.undefined;
//         });
//     });
//     describe("Queries", () => {
//         it("#getCurrentCampaignTier", async () => {
//             const campaign = await createCampaign(runningApp);
//             const query = gql.query({
//                 operation: "getCurrentCampaignTier",
//                 variables: {
//                     campaignId: { value: campaign.id, required: true },
//                 },
//                 fields: ["currentTier", "currentTotal"],
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(query)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             const response = res.body.data.getCurrentCampaignTier;
//             expect(response.currentTier).to.equal(4);
//             expect(response.currentTotal).to.equal(40);
//         });
//         it("#listCampaigns", async () => {
//             await createCampaign(runningApp);
//             await createCampaign(runningApp);
//             await createCampaign(runningApp);
//             await createCampaign(runningApp);
//             const query = gql.query({
//                 operation: "listCampaigns",
//                 fields: ["total"],
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(query)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             const response = res.body.data.listCampaigns;
//             expect(response.total).to.equal(4);
//         });
//         it("#getCampaign", async () => {
//             const campaign = await createCampaign(runningApp);
//             const query = gql.query({
//                 operation: "getCampaign",
//                 variables: { id: campaign.id },
//                 fields: ["name"],
//             });
//             const res = await request(runningApp.app)
//                 .post("/v1/graphql")
//                 .send(query)
//                 .set("Accepts", "application/json")
//                 .set("authorization", "Bearer raiinmaker");
//             const response = res.body.data.getCampaign;
//             expect(response.name).to.equal("bananaCampaign");
//         });
//     });
// });
