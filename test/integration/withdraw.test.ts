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
import request from "supertest";
import {createCampaign, createParticipant, createTransfer, createUser, createWallet} from "./specHelpers";
import {Transfer} from "../../src/models/Transfer";
import { S3Client } from "../../src/clients/s3";

describe.only('Withdraw Integration Test', function () {
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
        fullAppTestBed.stub(S3Client, 'getUserObject');
        Firebase.client = {
            auth: () => {},
        } as admin.app.App;
        fullAppTestBed.stub(Dragonchain, 'initialize');
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
       it('#initiateWithdraw', async () => {
           const wallet = await createWallet(runningApp, {balance: 200.00});
           const user = await createUser(runningApp, {wallet});
           const participant = await createParticipant(runningApp, {user});
           const campaign = await createCampaign(runningApp, {participant});
           await createTransfer(runningApp, {wallet, campaign, action:'withdraw', withdrawStatus: 'pending', amount: 50})
           await createTransfer(runningApp, {wallet, campaign, action:'withdraw', withdrawStatus: 'pending', amount: 50})
           mutation = gql.mutation({
               operation: 'initiateWithdraw',
               variables: {
                   withdrawAmount: {value: 99.01, required: true}
               },
               fields: ['amount', 'id']
           })
           const res = await request(runningApp.app)
               .post('/v1/graphql')
               .send(mutation)
               .set('Accepts', 'application/json')
               .set('authorization', 'Bearer raiinmaker');
           const response = res.body.data.initiateWithdraw;
           expect(response.amount).to.equal(99.01);
           const newTransfer = await Transfer.findOneOrFail(response.id);
           expect(newTransfer.withdrawStatus).to.equal('pending');
       });
       it('#initiateWithdraw [ERROR] throws wallet does not have required balance for this withdraw', async () => {
           const wallet = await createWallet(runningApp, {balance: 200.00});
           const user = await createUser(runningApp, {wallet});
           const participant = await createParticipant(runningApp, {user});
           const campaign = await createCampaign(runningApp, {participant});
           await createTransfer(runningApp, {wallet, campaign, action:'withdraw', withdrawStatus: 'pending', amount: 50})
           await createTransfer(runningApp, {wallet, campaign, action:'withdraw', withdrawStatus: 'pending', amount: 50})
           mutation = gql.mutation({
               operation: 'initiateWithdraw',
               variables: {
                   withdrawAmount: {value: 100.01, required: true}
               },
               fields: ['amount', 'id']
           })
           const res = await request(runningApp.app)
               .post('/v1/graphql')
               .send(mutation)
               .set('Accepts', 'application/json')
               .set('authorization', 'Bearer raiinmaker');
           expect(res.body.errors.length).to.equal(1);
           expect(res.body.errors[0].message).to.equal('wallet does not have required balance for this withdraw');
       });
       it('#updateWithdrawStatus', async () => {
           const wallet = await createWallet(runningApp, {balance: 200.00});
           const user = await createUser(runningApp, {wallet});
           const participant = await createParticipant(runningApp, {user});
           const campaign = await createCampaign(runningApp, {participant});
           const transfer1 = await createTransfer(runningApp, {wallet, campaign, action:'withdraw', withdrawStatus: 'pending', amount: 50})
           const transfer2 = await createTransfer(runningApp, {wallet, campaign, action:'withdraw', withdrawStatus: 'pending', amount: 50})
           mutation = gql.mutation({
               operation: 'updateWithdrawStatus',
               variables: {
                   transferIds: {value: [transfer1.id, transfer2.id], required: true, type: '[String]'},
                   status: {value: 'approve', required: true }
               },
               fields: ['id']
           })
           const res = await request(runningApp.app)
               .post('/v1/graphql')
               .send(mutation)
               .set('Accepts', 'application/json')
               .set('authorization', 'Bearer raiinmaker');
           const response = res.body.data.updateWithdrawStatus;
           expect(response.length).to.equal(2);
           const walletResult = await Wallet.findOneOrFail(wallet.id);
           expect(walletResult.balance).to.equal(100);
       });
    });
    describe('Queries', () => {
        let query;
        it('#getWithdrawals', async () => {
            const wallet = await createWallet(runningApp, {balance: 200.00});
            const wallet2 = await createWallet(runningApp);
            const user = await createUser(runningApp, {wallet});
            const user2 = await createUser(runningApp, {wallet: wallet2});
            const participant = await createParticipant(runningApp, {user});
            const participant2 = await createParticipant(runningApp, {user: user2});
            const campaign = await createCampaign(runningApp, {participants: [participant, participant2]});
            await createTransfer(runningApp, {wallet, campaign, action:'withdraw', withdrawStatus: 'approved', amount: 50})
            await createTransfer(runningApp, {wallet, campaign, action:'withdraw', withdrawStatus: 'approved', amount: 50})
            await createTransfer(runningApp, {wallet: wallet2, action: 'withdraw', withdrawStatus: 'approved'});
            query = gql.query({
                operation: 'getWithdrawals',
                variables: {
                    status: 'approved'
                },
                fields: [{user: ['id']}]
            })
            const res = await request(runningApp.app)
                .post('/v1/graphql')
                .send(query)
                .set('Accepts', 'application/json')
                .set('authorization', 'Bearer raiinmaker');
            const response = res.body.data.getWithdrawals;
            expect(response.length).to.equal(2);
        });
    });
});
