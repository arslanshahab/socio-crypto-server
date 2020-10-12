import { expect } from 'chai';
import { createSandbox } from 'sinon';
import request from 'supertest';
import { Application } from '../../src/app';
import { Dragonchain } from '../../src/clients/dragonchain';
import { Participant } from '../../src/models/Participant';
import { Campaign } from '../../src/models/Campaign';
import { User } from '../../src/models/User';
import { Wallet } from '../../src/models/Wallet';
import { Firebase } from '../../src/clients/firebase';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import {createCampaign, createParticipant, createUser, createWallet} from './specHelpers';
import * as gql from 'gql-query-builder';
import { Paypal } from '../../src/clients/paypal';

describe('User Integration Test', () => {
  let runningApp: Application;
  const fullAppTestbed = createSandbox();

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
    fullAppTestbed.stub(Dragonchain, 'initialize');
    fullAppTestbed.stub(Firebase, 'initialize');
    fullAppTestbed.stub(Paypal, 'initialize');
    fullAppTestbed.stub(Paypal, 'refreshToken');
    Firebase.client = {
      auth: () => {},
    } as admin.app.App;
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
    fullAppTestbed.restore();
    await runningApp.databaseConnection.close();
    await runningApp.runningServer.close();
  });

  describe('GET /health', () => {
    it('responds 200 OK with no authorization', async () => {
      const res = await request(runningApp.app)
        .get('/v1/health')
        .set('Accept', 'application/json');
      expect(res.status).to.equal(200);
    });
  });

  describe('Public User queries', () => {
    describe('Username Exists', () => {

      beforeEach(async () => {
        const wallet = await createWallet(runningApp);
        await createUser(runningApp, {wallet, profileOptions: {username: 'coolestBanana'}});
      });

      it('should return true if the username exists', async () => {
        const query = gql.query({
          operation: 'usernameExists',
          variables: {
            username: {value: 'coolestBanana', required: true}
          },
          fields: ['exists']
        })
        const res = await request(runningApp.app)
          .post('/v1/public/graphql')
          .send(query)
          .set('Accepts', 'application/json');

        expect(res.body.data.usernameExists).to.deep.equal({ exists: true });
        expect(res.status).to.equal(200);
      });

      it('should return false if the username does not exists', async () => {
        const query = gql.query({
          operation: 'usernameExists',
          variables: {
            username: {value: 'banana', required: true}
          },
          fields: ['exists']
        })
        const res = await request(runningApp.app)
          .post('/v1/public/graphql')
          .send(query)
          .set('Accepts', 'application/json');

        expect(res.body.data.usernameExists).to.deep.equal({ exists: false });
        expect(res.status).to.equal(200);
      });
    });
  });

  describe('Private User Queries', () => {
    describe('Get me', () => {
      const testbed = createSandbox();
      let user: User;
      let wallet: Wallet;

      beforeEach(async () => {
        wallet = await createWallet(runningApp);
        user = await createUser(runningApp, {wallet, username: 'coolestBanana', email: 'b@a.com'});
      });

      afterEach(() => {
        testbed.restore();
      });

      it('should return my user', async () => {
        console.log(user);
        const query = gql.query({
          operation: 'me',
          fields: ['id', 'username', 'email']
        })
        const res = await request(runningApp.app)
          .post('/v1/graphql')
          .send(query)
          .set('authorization', 'Bearer raiinmaker')
          .set('Accepts', 'application/json');
        const response = res.body.data.me;
        expect(response.id).to.equal(user.id);
        expect(response.username).to.equal(user.profile.username);
        expect(response.email).to.equal(user.profile.email);
      });

      it('should return user not found when user is not found', async () => {
        const query = gql.query({
          operation: 'me',
          fields: ['id', 'username', 'email']
        })
        const res = await request(runningApp.app)
          .post('/v1/graphql')
          .send(query)
          .set('authorization', 'Bearer raiinmaker')
          .set('user-id', 'bacon-salad')
          .set('Accepts', 'application/json');

          expect(res.body.errors.length).to.equal(1);
          expect(res.body.errors[0].message).to.equal('user not found');
      });
    });

    describe('(ADMIN) List users', () => {
      const testbed = createSandbox();
      let wallet: Wallet;

      beforeEach(async () => {
        wallet = await createWallet(runningApp);
        await createUser(runningApp, {wallet});
      });

      afterEach(() => {
        testbed.restore();
      });

      it('should return forbidden when user is not admin', async () => {
        const query = gql.query({
          operation: 'listUsers',
          fields: [{'results': ['id']}, 'total']
        })
        const res = await request(runningApp.app)
          .post('/v1/graphql')
          .send(query)
          .set('Accepts', 'application/json')
          .set('authorization', 'Bearer raiinmaker')
          .set('role', 'manager');

        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('forbidden');
      });

      it('should return a list of users', async () => {
        const query = gql.query({
          operation: 'listUsers',
          fields: [{'results': ['id']}, 'total']
        })
        const res = await request(runningApp.app)
          .post('/v1/graphql')
          .send(query)
          .set('Accepts', 'application/json')
          .set('authorization', 'Bearer raiinmaker');
        const response = res.body.data.listUsers;
        expect(response.total).to.equal(1);
        expect(response.results.length).to.equal(1);
      });
    });

    describe('Participate in campaigns', () => {
      const testbed = createSandbox();
      let user: User;
      let campaign: Campaign;

      beforeEach(async () => {
        const wallet = await createWallet(runningApp);
        user = await createUser(runningApp, {wallet, username: 'coolestBanana', email: 'b@a.com'})
        campaign = await createCampaign(runningApp, {});
      });

      afterEach(() => {
        testbed.restore();
      });

      it('should allow you to participate in the open campaign', async () => {
        const mutation = gql.mutation({
          operation: 'participate',
          variables: {
            campaignId: {value: campaign.id, required: true}
          },
          fields: ['id', {user: ['id']}, {campaign: ['id']}]
        })
        const res = await request(runningApp.app)
          .post('/v1/graphql')
          .send(mutation)
          .set('Accepts', 'application/json')
          .set('authorization', 'Bearer raiinmaker');
        const response = res.body.data.participate;
        expect(response.user.id).to.equal(user.id);
        expect(response.campaign.id).to.equal(campaign.id);
      });

      it('should throw an error when the campaign is closed', async () => {
        const mutation = gql.mutation({
          operation: 'participate',
          variables: {
            campaignId: {value: campaign.id, required: true}
          },
          fields: ['id', {user: ['id']}, {campaign: ['id']}]
        })
        campaign.endDate = (() => {
          const date = new Date();
          date.setUTCDate(date.getUTCDate() - 1);
          return new Date(date);
        })();
        await runningApp.databaseConnection.createEntityManager().save(campaign);
        const res = await request(runningApp.app)
          .post('/v1/graphql')
          .send(mutation)
          .set('Accepts', 'application/json')
          .set('authorization', 'Bearer raiinmaker');
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('campaign is not open for participation');
      });

      it('should throw error when campaign is not found', async () => {
        const mutation = gql.mutation({
          operation: 'participate',
          variables: {
            campaignId: {value: uuidv4(), required: true}
          },
          fields: ['id', {user: ['id']}, {campaign: ['id']}]
        })
        const res = await request(runningApp.app)
          .post('/v1/graphql')
          .send(mutation)
          .set('Accepts', 'application/json')
          .set('authorization', 'Bearer raiinmaker');

        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('campaign not found');
      });
    });

    describe('Remove Participation', () => {
      const testbed = createSandbox();
      let user: User;
      let wallet: Wallet;
      let campaign: Campaign;
      let participant: Participant;

      beforeEach(async () => {
        wallet = await createWallet(runningApp);
        user = await createUser(runningApp, {wallet, username: 'coolestBanana', email: 'b@a.com'})
        participant = await createParticipant(runningApp, {user})
        campaign = await createCampaign(runningApp, {participants: [participant]})
      });

      afterEach(() => {
        testbed.restore();
      });

      it('should successfully remove the user from the campaign', async () => {
        const mutation = await gql.mutation({
          operation: 'removeParticipation',
          variables: {
            campaignId: { value: campaign.id, required: true }
          },
          fields: ['id']
        })
        const res = await request(runningApp.app)
          .post('/v1/graphql')
          .send(mutation)
          .set('authorization', 'Bearer raiinmaker')
          .set('Accepts', 'application/json');

        const response = res.body.data.removeParticipation;
        expect(response.id).to.equal(user.id);
      });

      it('should throw user not found when the user is not found', async () => {
        const mutation = await gql.mutation({
          operation: 'removeParticipation',
          variables: {
            campaignId: { value: campaign.id, required: true }
          },
          fields: ['id']
        })
        const res = await request(runningApp.app)
          .post('/v1/graphql')
          .send(mutation)
          .set('authorization', 'Bearer raiinmaker')
          .set('user-id', 'bacon')
          .set('Accepts', 'application/json')
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('user not found');
      });

      it('should throw campaign not found when the campaign is not found', async () => {
        const mutation = await gql.mutation({
          operation: 'removeParticipation',
          variables: {
            campaignId: { value: uuidv4(), required: true }
          },
          fields: ['id']
        })
        const res = await request(runningApp.app)
          .post('/v1/graphql')
          .send(mutation)
          .set('authorization', 'Bearer raiinmaker')
          .set('Accepts', 'application/json')

        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('campaign not found');
      });
      it('should user not participating error', async () => {
        const mutation = await gql.mutation({
          operation: 'removeParticipation',
          variables: {
            campaignId: { value: campaign.id, required: true }
          },
          fields: ['id']
        })
        const wallet = await createWallet(runningApp);
        const user = await createUser(runningApp, {wallet, identityId: 'bacon-salad'});
        const res = await request(runningApp.app)
          .post('/v1/graphql')
          .send(mutation)
          .set('authorization', 'Bearer raiinmaker')
          .set('Accepts', 'application/json')
          .set('user-id', user.identityId);

        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('user was not participating in campaign');
      });
    });
  });
});
