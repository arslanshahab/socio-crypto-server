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
import * as gql from 'gql-query-builder';
import {createProfile, createUser} from './specHelpers';
import { Paypal } from '../../src/clients/paypal';
import { Transfer } from '../../src/models/Transfer';
import { ExternalAddress } from '../../src/models/ExternalAddress';
import { Profile } from '../../src/models/Profile';
import { sha256Hash } from '../../src/util/crypto';

describe('Profile Integrations Tests', () => {
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
      process.env.STRIPE_API_KEY = "banana";
      process.env.STRIPE_WEBHOOK_SECRET = "banana";
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

  beforeEach(async () => {
    await Profile.query('TRUNCATE public.profile CASCADE');
    await ExternalAddress.query('TRUNCATE public.external_address CASCADE');
    await Transfer.query('TRUNCATE public.transfer CASCADE');
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

  describe('#updateUsername', () => {
    it('should successfully update the username', async () => {
      const user = await createUser(runningApp);
      const mutation = gql.mutation({
        operation: 'updateUsername',
        variables: {
          username: { value: 'bestUsernameEver', required: true }
        },
        fields: ['id', 'username']
      });
      const res = await request(runningApp.app)
        .post('/v1/graphql')
        .send(mutation)
        .set('Accepts', 'application/json')
        .set('authorization', 'Bearer raiinmaker');
      const response = res.body.data.updateUsername;
      expect(response.id).to.equal(user.id);
      expect(response.username).to.equal('bestUsernameEver');
    });
    it('should throw error when username is already registered', async () => {
      const existingProfile = await createProfile(runningApp, { username: 'bestUsernameEver' });
      await createUser(runningApp, {identityId: 'bogusIdentity', profile: existingProfile});
      await createUser(runningApp);
      const mutation = gql.mutation({
        operation: 'updateUsername',
        variables: {
          username: { value: 'bestUsernameEver', required: true }
        },
        fields: ['id', 'username']
      });
      const res = await request(runningApp.app)
        .post('/v1/graphql')
        .send(mutation)
        .set('Accepts', 'application/json')
        .set('authorization', 'Bearer raiinmaker');
      expect(res.body.data.updateUsername).to.equal(null);
      expect(res.body.errors.length).to.equal(1);
      expect(res.body.errors[0].message).to.equal('username is already registered');
    });
  });
  describe('#setRecoveryCode', () => {
    it('should successfully set the recovery code', async () => {
      const user = await createUser(runningApp);
      const mutation = gql.mutation({
        operation: 'setRecoveryCode',
        variables: {
          code: { value: 123456, required: true }
        },
        fields: ['id']
      });
      await request(runningApp.app)
        .post('/v1/graphql')
        .send(mutation)
        .set('Accepts', 'application/json')
        .set('authorization', 'Bearer raiinmaker');
      const profile = await Profile.findOneOrFail({ where: { user } });
      expect(profile.recoveryCode).to.equal(sha256Hash('123456'));
    });
    it('should return not found when the user is not found', async () => {
      const mutation = gql.mutation({
        operation: 'setRecoveryCode',
        variables: {
          code: { value: 123456, required: true }
        },
        fields: ['id']
      });
      const res = await request(runningApp.app)
        .post('/v1/graphql')
        .send(mutation)
        .set('Accepts', 'application/json')
        .set('authorization', 'Bearer raiinmaker');
      expect(res.body.data.setRecoveryCode).to.be.null;
      expect(res.body.errors.length).to.equal(1);
      expect(res.body.errors[0].message).to.equal('user not found');
    });
  });
  describe('#updateProfileInterests', () => {
    it('should successfully update user profile', async () => {
      const user = await createUser(runningApp);
      const mutation = gql.mutation({
        operation: 'updateProfileInterests',
        variables: {
          city: { value: 'kirkland', required: false },
          state: { value: 'washington', required: false },
          interests: { value: ['technology'], required: false, type: '[String]' }
        },
        fields: ['id']
      });
      await request(runningApp.app)
        .post('/v1/graphql')
        .send(mutation)
        .set('Accepts', 'application/json')
        .set('authorization', 'Bearer raiinmaker');
      const profile = await Profile.findOneOrFail({ where: { user } });
      expect(profile.city).to.equal('kirkland');
      expect(profile.state).to.equal('washington');
      expect(profile.interests.length).to.equal(1);
      expect(profile.interests[0]).to.equal('technology');
    });
    it('should return not found when the user is not found', async () => {
      const mutation = gql.mutation({
        operation: 'updateProfileInterests',
        variables: {
          city: { value: 'kirkland', required: false },
          state: { value: 'washington', required: false },
          interests: { value: ['technology'], required: false, type: '[String]' }
        },
        fields: ['id']
      });
      const res = await request(runningApp.app)
        .post('/v1/graphql')
        .send(mutation)
        .set('Accepts', 'application/json')
        .set('authorization', 'Bearer raiinmaker');
      expect(res.body.data.updateProfileInterests).to.be.null;
      expect(res.body.errors.length).to.equal(1);
      expect(res.body.errors[0].message).to.equal('user not found');
    });
  });
  describe('#removeProfileInterests', () => {
    it('should successfully remove user city and state', async () => {
      const userProfile = await createProfile(runningApp, {city: 'town', state: 'washington'});
      const user = await createUser(runningApp, {profile: userProfile});
      const mutation = gql.mutation({
        operation: 'removeProfileInterests',
        variables: {
          city: { value: 'kirkland', required: false },
          state: { value: 'washington', required: false },
        },
        fields: ['id']
      });
      await request(runningApp.app)
        .post('/v1/graphql')
        .send(mutation)
        .set('Accepts', 'application/json')
        .set('authorization', 'Bearer raiinmaker');
      const profile = await Profile.findOneOrFail({ where: { user } });
      expect(profile.city).to.be.null;
      expect(profile.state).to.be.null;
    });
    it('should successfully remove user city and state', async () => {
      const mutation = gql.mutation({
        operation: 'removeProfileInterests',
        variables: {
          city: { value: 'kirkland', required: false },
          state: { value: 'washington', required: false },
        },
        fields: ['id']
      });
      const res = await request(runningApp.app)
        .post('/v1/graphql')
        .send(mutation)
        .set('Accepts', 'application/json')
        .set('authorization', 'Bearer raiinmaker');
      expect(res.body.data.removeProfileInterests).to.be.null;
      expect(res.body.errors.length).to.equal(1);
      expect(res.body.errors[0].message).to.equal('user not found');
    });
  });
});
