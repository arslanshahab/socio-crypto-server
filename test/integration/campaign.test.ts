import { expect } from 'chai';
import { createSandbox } from 'sinon';
import request from 'supertest';
import {Application} from "../../src/app";
import {Dragonchain} from "../../src/clients/dragonchain";
import {Participant} from "../../src/models/Participant";
import {Campaign} from "../../src/models/Campaign";
import {Wallet} from "../../src/models/Wallet";
import {User} from "../../src/models/User";
import * as RedisClient from "../../src/clients/redis";
import {createCampaign, createParticipant, getBeginDate, getEndDate} from "./specHelpers";
import * as gql from 'gql-query-builder';
import {Firebase} from "../../src/clients/firebase";
import * as admin from "firebase-admin";

describe('Campaign Integration Test', () => {
   let runningApp: Application;
   const fullAppTestBed = createSandbox();

   const setEnv = () => {
      process.env.BEARER_TOKEN = "banana";
      process.env.DRAGONCHAIN_ID = "bogusId";
      process.env.DRAGONCHAIN_ENDPOINT = "https://bogusDragonchainEndpoint.com";
      process.env.DRAGONCHAIN_API_KEY_ID = "bogusApiKeyId";
      process.env.DRAGONCHAIN_API_KEY = "bogusApiKey";
      process.env.ENCRYPTION_KEY = "bogusEncryptionKey";
      process.env.TWITTER_CONSUMER_KEY = "fakeTwitter";
      process.env.TWITTER_CONSUMER_SECRET_KEY = "fakeTwitter";
   };

   before(async () => {
      setEnv();
      fullAppTestBed.stub(Firebase, 'initialize');
      fullAppTestBed.stub(Firebase, 'sendCampaignCompleteNotifications');
      Firebase.client = {
         auth: () => {},
      } as admin.app.App;
      fullAppTestBed.stub(Dragonchain, 'initialize');
      fullAppTestBed.stub(Dragonchain, 'ledgerCampaignAudit');
      fullAppTestBed.stub(RedisClient, 'getRedis');
      runningApp = new Application();
      await runningApp.initializeServer();
      await runningApp.startServer();
   });

   afterEach(async () => {
      await Participant.query('TRUNCATE public.participant CASCADE');
      await Campaign.query('TRUNCATE public.campaign CASCADE');
      await Wallet.query('TRUNCATE public.wallet CASCADE');
      await User.query('TRUNCATE public.user CASCADE');
   });

   after(async () => {
      fullAppTestBed.restore();
      await runningApp.databaseConnection.close();
      await runningApp.runningServer.close();
   });
   describe('Mutations', () => {
      it('#newCampaign', async () => {
         const beginDate = getBeginDate().toString();
         const endDate = getEndDate().toString();
         const algorithm = JSON.stringify({"version": "1", "initialTotal": "1000", "tiers":{"1":{"threshold":"25000","totalCoiins":"1000"},"2":{"threshold":"50000","totalCoiins":"3000"},"3":{"threshold":"75000","totalCoiins":"5000"},"4":{"threshold":"100000","totalCoiins":"7000"},"5":{"threshold":"250000","totalCoiins":"10000"}},"pointValues":{"click": "14","view": "10","submission": "201", "likes": "201", "shares": "201"}});
         const mutation = gql.mutation({
            operation: 'newCampaign',
            variables: {
               name: {value: 'banana', required: true},
               coiinTotal: {value: 21.24, required: true},
               target: {value: "bacon", required: true},
               targetVideo: {value: "bacon-video", required: true},
               beginDate: {value: beginDate, required: true },
               endDate: {value: endDate, required: true},
               algorithm: {value: algorithm, required: true },
               company: 'raiinmaker',
            },
            fields: ['name']
         })
         const res = await request(runningApp.app)
             .post('/v1/graphql')
             .send(mutation)
             .set('Accepts', 'application/json')
             .set('authorization', 'Bearer raiinmaker');
         const response = res.body.data.newCampaign;
         expect(response.name).to.equal('banana');
      })
      it('#updateCampaign', async () => {
         const campaign = await createCampaign(runningApp, {});
         const mutation = gql.mutation({
            operation: 'updateCampaign',
            variables: {
               id: {value: campaign.id, required: true},
               name: 'bacon-campaign',
               coiinTotal: 2000.10,
            },
            fields: ['coiinTotal']
         })
         const res = await request(runningApp.app)
             .post('/v1/graphql')
             .send(mutation)
             .set('Accepts', 'application/json')
             .set('authorization', 'Bearer raiinmaker');
         expect(res.body.data.updateCampaign.coiinTotal).to.equal(2000.1);
      });
      it('#generateCampaignAudit', async () => {
         const participant1 = await createParticipant(runningApp);
         const participant2 = await createParticipant(runningApp);
         const participant3 = await createParticipant(runningApp);
         const campaign = await createCampaign(runningApp, {participants: [participant1, participant2, participant3], totalParticipationScore: BigInt(45)});
         const mutation = gql.mutation({
            operation: 'generateCampaignAuditReport',
            variables: {
               campaignId: {value: campaign.id, required: true},
            },
            fields: ['totalViews', 'totalClicks', 'totalSubmissions', 'totalRewardPayout']
         })
         const res = await request(runningApp.app)
             .post('/v1/graphql')
             .send(mutation)
             .set('Accepts', 'application/json')
             .set('authorization', 'Bearer raiinmaker');
         const response = res.body.data.generateCampaignAuditReport;
         expect(response.totalViews).to.equal(15);
         expect(response.totalClicks).to.equal(15);
         expect(response.totalSubmissions).to.equal(15);
         expect(response.totalRewardPayout).to.equal(40)
      });
      it('#payoutCampaignRewards', async () => {
         const campaign = await createCampaign(runningApp, {totalParticipationScore: 60});
         let participant1 = await createParticipant(runningApp, {
            campaign,
            userOptions: {
               walletOptions: {
                  balance: 50
               }
            }
         });
         let participant2 = await createParticipant(runningApp, {
            campaign,
            ParticipationScore: 30,
            clickCount: 10,
            viewCount: 10,
            submissionCount: 10,
            userOptions: {
               walletOptions: {
                  balance: 50
               }
         }});
         let participant3 = await createParticipant(runningApp, {campaign, userOptions: {walletOptions: {balance: 50}}});
         const mutation = gql.mutation({
            operation: 'payoutCampaignRewards',
            variables: {
               campaignId: { value: campaign.id, required: true },
               rejected: { value: [], type:'[String]', required: true }
            },
         })
         const res = await request(runningApp.app)
             .post('/v1/graphql')
             .send(mutation)
             .set('Accepts', 'application/json')
             .set('authorization', 'Bearer raiinmaker');
         participant1 = await Participant.findOneOrFail({id: participant1.id}) ;
         participant2 = await Participant.findOneOrFail({id: participant2.id})
         participant3 = await Participant.findOneOrFail({id: participant3.id})
         const response = res.body.data.payoutCampaignRewards;
         expect(response).to.be.true;
         const wallet1 = await Wallet.findOneOrFail({where: {user: participant1.user.id}, relations: ['user']});
         const wallet2 = await Wallet.findOneOrFail({where: {user: participant2.user.id}, relations: ['user']});
         const wallet3 = await Wallet.findOneOrFail({where: {user: participant3.user.id}, relations: ['user']});
         expect(wallet1.balance - 50).to.equal(12.5);
         expect(wallet2.balance - 50).to.equal(25);
         expect(wallet3.balance - 50).to.equal(12.5);
      });
      it.only('#payoutCampaignRewards with 0 total participation', async () => {
         const campaign = await createCampaign(runningApp, {totalParticipationScore: 0});
         let participant1 = await createParticipant(runningApp, {
            campaign,
            ParticipationScore: 0,
            clickCount: 0,
            viewCount: 0,
            submissionCount: 0,
            userOptions: {
               walletOptions: {
                  balance: 50
               }
            }});
         let participant2 = await createParticipant(runningApp, {
            campaign,
            ParticipationScore: 0,
            clickCount: 0,
            viewCount: 0,
            submissionCount: 0,
            userOptions: {
               walletOptions: {
                  balance: 50
               }
         }});
         let participant3 = await createParticipant(runningApp, {
            campaign,
            ParticipationScore: 0,
            clickCount: 0,
            viewCount: 0,
            submissionCount: 0,
            userOptions: {
               walletOptions: {
                  balance: 50
               }
            }});
         const mutation = gql.mutation({
            operation: 'payoutCampaignRewards',
            variables: {
               campaignId: { value: campaign.id, required: true },
               rejected: { value: [], type:'[String]', required: true }
            },
         })
         const res = await request(runningApp.app)
             .post('/v1/graphql')
             .send(mutation)
             .set('Accepts', 'application/json')
             .set('authorization', 'Bearer raiinmaker');
         participant1 = await Participant.findOneOrFail({id: participant1.id}) ;
         participant2 = await Participant.findOneOrFail({id: participant2.id})
         participant3 = await Participant.findOneOrFail({id: participant3.id})
         const response = res.body.data.payoutCampaignRewards;
         expect(response).to.be.true;
         const wallet1 = await Wallet.findOneOrFail({where: {user: participant1.user.id}, relations: ['user']});
         const wallet2 = await Wallet.findOneOrFail({where: {user: participant2.user.id}, relations: ['user']});
         const wallet3 = await Wallet.findOneOrFail({where: {user: participant3.user.id}, relations: ['user']});
         expect(wallet1.balance).to.equal(50);
         expect(wallet2.balance).to.equal(50);
         expect(wallet3.balance).to.equal(50);
      });
      it('#deleteCampaign', async () => {
         const campaign = await createCampaign(runningApp);
         const mutation = gql.mutation({
            operation: 'deleteCampaign',
            variables: {
               id: {value: campaign.id, required: true}
            },
            fields: ['name']
         })
         const res = await request(runningApp.app)
             .post('/v1/graphql')
             .send(mutation)
             .set('Accepts', 'application/json')
             .set('authorization', 'Bearer raiinmaker');
         const response = res.body.data.deleteCampaign;
         expect(response.name).to.equal('bananaCampaign')
         expect(await Campaign.findOne({where: {name: response.name}})).to.be.undefined;
      })
   });
   describe('Queries', () => {
      it('#getCurrentCampaignTier', async () => {
         const campaign = await createCampaign(runningApp);
         const query = gql.query({
            operation: 'getCurrentCampaignTier',
            variables: {
               campaignId: {value: campaign.id, required: true}
            },
            fields: ['currentTier', 'currentTotal']
         })
         const res = await request(runningApp.app)
             .post('/v1/graphql')
             .send(query)
             .set('Accepts', 'application/json')
             .set('authorization', 'Bearer raiinmaker');
         const response = res.body.data.getCurrentCampaignTier;
         expect(response.currentTier).to.equal(4);
         expect(response.currentTotal).to.equal(40);
      });
      it('#listCampaigns', async () => {
         await createCampaign(runningApp);
         await createCampaign(runningApp);
         await createCampaign(runningApp);
         await createCampaign(runningApp);
         const query = gql.query({
            operation: 'listCampaigns',
            fields: ['total']
         });
          const res = await request(runningApp.app)
             .post('/v1/graphql')
             .send(query)
             .set('Accepts', 'application/json')
             .set('authorization', 'Bearer raiinmaker');
         const response = res.body.data.listCampaigns;
         expect(response.total).to.equal(4)
      });
      it('#getCampaign', async () => {
         const campaign = await createCampaign(runningApp);
         const query = gql.query({
            operation:'getCampaign',
            variables: {id: campaign.id},
            fields: ['name']
         })
         const res = await request(runningApp.app)
             .post('/v1/graphql')
             .send(query)
             .set('Accepts', 'application/json')
             .set('authorization', 'Bearer raiinmaker');
         const response = res.body.data.getCampaign;
         expect(response.name).to.equal('bananaCampaign');
      });
   });
});


