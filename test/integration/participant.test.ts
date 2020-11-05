import {Application} from "../../src/app";
import { expect } from 'chai';
import {createSandbox} from "sinon";
import {Firebase} from "../../src/clients/firebase";
import * as admin from "firebase-admin";
import {Dragonchain} from "../../src/clients/dragonchain";
import {Participant} from "../../src/models/Participant";
import {Campaign} from "../../src/models/Campaign";
import {Wallet} from "../../src/models/Wallet";
import {User} from "../../src/models/User";
import * as gql from 'gql-query-builder';
import {createParticipant} from "./specHelpers";
import request from "supertest";
import { DailyParticipantMetric } from "../../src/models/DailyParticipantMetric";
import { Paypal } from "../../src/clients/paypal";

describe('Participant Integration Test', () => {
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
      process.env.PAYPAL_CLIENT_ID = "dummyKey";
      process.env.PAYPAL_CLIENT_SECRET = "dummyKey";
      process.env.FACTOR_PROVIDER_PRIVATE_KEY = "privKey";
      process.env.FACTOR_PROVIDER_PUBLIC_KEY = "pubKey";
      process.env.ETH_HOT_WALLET_PRIVKEY = "ethPrivKey";
    };

    before(async () => {
        setEnv();
        fullAppTestBed.stub(Dragonchain, 'initialize');
        fullAppTestBed.stub(Firebase, 'initialize');
        fullAppTestBed.stub(Paypal, 'initialize');
        fullAppTestBed.stub(Paypal, 'refreshToken');
        fullAppTestBed.stub(Firebase, 'sendCampaignCompleteNotifications');
        Firebase.client = {
            auth: () => {},
        } as admin.app.App;
        fullAppTestBed.stub(Dragonchain, 'ledgerCampaignAction');
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
        let mutation;
        it('#trackAction click', async () => {
            const participant = await createParticipant(runningApp);
            mutation = gql.mutation({
                operation: 'trackAction',
                variables: {
                    participantId: {value: participant.id, required: true},
                    action: {value: 'click', required: true}
                },
                fields: ['id']
            });
            const res = await request(runningApp.app)
                .post('/v1/public/graphql')
                .send(mutation)
                .set('Accepts', 'application/json')
            const response = res.body.data.trackAction;
            expect(response.id).to.equal(participant.id);
            const participantResult = await Participant.findOneOrFail({where: {id: participant.id}});
            const campaignResult = await Campaign.findOneOrFail(participant.campaign.id);
            const adjustedTotalParticipationScore = campaignResult.totalParticipationScore.minus(participant.campaign.totalParticipationScore);
            const adjustedClickCount = participantResult.clickCount.minus(participant.clickCount);
            const adjustedParticipationScore = participantResult.participationScore.minus(participant.participationScore);
            expect(adjustedParticipationScore.toString()).to.equal(campaignResult.algorithm.pointValues.click.toString());
            expect(adjustedTotalParticipationScore.toString()).to.equal(campaignResult.algorithm.pointValues.click.toString());
            expect(adjustedClickCount.toString()).to.equal('1');
        });
        it('#trackAction view', async () => {
            const participant = await createParticipant(runningApp);
            mutation = gql.mutation({
                operation: 'trackAction',
                variables: {
                    participantId: {value: participant.id, required: true},
                    action: {value: 'view', required: true}
                },
                fields: ['id']
            });
            const res = await request(runningApp.app)
                .post('/v1/public/graphql')
                .send(mutation)
                .set('Accepts', 'application/json')
            const response = res.body.data.trackAction;
            expect(response.id).to.equal(participant.id);
            const participantResult = await Participant.findOneOrFail({where: {id: participant.id}});
            const campaignResult = await Campaign.findOneOrFail(participant.campaign.id);
            const adjustedTotalParticipationScore = campaignResult.totalParticipationScore.minus(participant.campaign.totalParticipationScore);
            const adjustedViewCount = participantResult.viewCount.minus(participant.viewCount);
            const adjustedParticipationScore = participantResult.participationScore.minus(participant.participationScore);
            expect(adjustedParticipationScore.toString()).to.equal(campaignResult.algorithm.pointValues.view.toString());
            expect(adjustedTotalParticipationScore.toString()).to.equal(campaignResult.algorithm.pointValues.view.toString());
            expect(adjustedViewCount.toString()).to.equal('1');
        });
        it('#trackAction submission', async () => {
            const participant = await createParticipant(runningApp);
            mutation = gql.mutation({
                operation: 'trackAction',
                variables: {
                    participantId: {value: participant.id, required: true},
                    action: {value: 'submission', required: true}
                },
                fields: ['id']
            });
            const res = await request(runningApp.app)
                .post('/v1/public/graphql')
                .send(mutation)
                .set('Accepts', 'application/json')
            const response = res.body.data.trackAction;
            expect(response.id).to.equal(participant.id);
            const participantResult = await Participant.findOneOrFail({where: {id: participant.id}});
            const campaignResult = await Campaign.findOneOrFail(participant.campaign.id);
            const adjustedTotalParticipationScore = campaignResult.totalParticipationScore.minus(participant.campaign.totalParticipationScore);
            const adjustedsubmissionCount = participantResult.submissionCount.minus(participant.submissionCount);
            const adjustedParticipationScore = participantResult.participationScore.minus(participant.participationScore);
            expect(adjustedParticipationScore.toString()).to.equal(campaignResult.algorithm.pointValues.submission.toString());
            expect(adjustedTotalParticipationScore.toString()).to.equal(campaignResult.algorithm.pointValues.submission.toString());
            expect(adjustedsubmissionCount.toString()).to.equal('1');
        });
        it('#trackAction throws invalid metric', async () => {
            const participant = await createParticipant(runningApp);
            mutation = gql.mutation({
                operation: 'trackAction',
                variables: {
                    participantId: {value: participant.id, required: true},
                    action: {value: 'bacon', required: true}
                },
                fields: ['id']
            });
            const res = await request(runningApp.app)
                .post('/v1/public/graphql')
                .send(mutation)
                .set('Accepts', 'application/json')
            expect(res.body.errors.length).to.equal(1);
            expect(res.body.errors[0].message).to.equal('invalid metric specified');
        });
        it('#trackAction registers click with daily metrics table', async () => {
          const participant = await createParticipant(runningApp);
          mutation = gql.mutation({
              operation: 'trackAction',
              variables: {
                  participantId: {value: participant.id, required: true},
                  action: {value: 'click', required: true}
              },
              fields: ['id']
          });
          await request(runningApp.app)
              .post('/v1/public/graphql')
              .send(mutation)
              .set('Accepts', 'application/json')
          await request(runningApp.app)
              .post('/v1/public/graphql')
              .send(mutation)
              .set('Accepts', 'application/json')
          const metrics = await DailyParticipantMetric.findOneOrFail({ where: { participantId: participant.id } });
          expect(metrics.clickCount.toString()).to.equal('2');
          expect(metrics.participationScore.toString()).to.equal('2');
      });
    });
});
