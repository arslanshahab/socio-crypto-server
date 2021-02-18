import { expect } from 'chai';
import { createSandbox } from 'sinon';
import request from 'supertest';
import { Application } from '../../src/app';
import { Dragonchain } from '../../src/clients/dragonchain';
import { Firebase } from '../../src/clients/firebase';
import * as admin from 'firebase-admin';
import {clearDB, createExternalAddress, createUser} from './specHelpers';
import * as gql from 'gql-query-builder';
import { Paypal } from '../../src/clients/paypal';
import { ExternalAddress } from '../../src/models/ExternalAddress';

describe('External Wallet Integrations Tests', () => {
  let runningApp: Application;
  const fullAppTestbed = createSandbox();
  const ethereumAddress = '0xBE9F5eDC8C7047a499ee5279D07c7f4D1D565499';
  const signature = '0xd3509ddad8b606c4c47b05dd056f83a4b4edfedc7c8f72d21dda25567712f6dd0fc01d1d6f1bd641d5b2652ff490230b6a56e8693f7e642a0a9b450f62dc9ba91b';

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
    await clearDB()
  });

  after(async () => {
    fullAppTestbed.restore();
    await runningApp.databaseConnection.close();
    await runningApp.runningServer.close();
  });

  describe('Mutations', () => {
    describe('#attach', () => {
      it('attach wallet to account (begin claim process)', async () => {
        await createUser(runningApp);
        const mutation = gql.mutation({
            operation: 'attachEthereumAddress',
            variables: {
                ethereumAddress: { value: ethereumAddress, required: true }
            },
            fields: ['ethereumAddress', 'message']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(mutation)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker')
        const response = res.body.data.attachEthereumAddress;
        expect(response.ethereumAddress).to.equals(ethereumAddress.toLowerCase());
      });
      it('attach wallet fails because it is already attached', async () => {
        const user = await createUser(runningApp);
        await (ExternalAddress.newFromAttachment(ethereumAddress.toLowerCase(), user, true)).save();
        const mutation = gql.mutation({
            operation: 'attachEthereumAddress',
            variables: {
                ethereumAddress: { value: ethereumAddress, required: true }
            },
            fields: ['ethereumAddress']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(mutation)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker')
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.data.attachEthereumAddress).to.equal(null);
        expect(res.body.errors[0].message).to.equal('ethereum address already registered');
      });
      it('#attach wallet fails because user is not found', async () => {
        const mutation = gql.mutation({
            operation: 'attachEthereumAddress',
            variables: {
                ethereumAddress: { value: ethereumAddress, required: true }
            },
            fields: ['ethereumAddress']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(mutation)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker')
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.data.attachEthereumAddress).to.equal(null);
        expect(res.body.errors[0].message).to.equal('user not found');
      });
    });

    describe('#claim', () => {
      it('should successfully claim wallet', async () => {
        const user = await createUser(runningApp);
        await createExternalAddress(runningApp, {ethereumAddress: ethereumAddress.toLowerCase(), user});
        const mutation = gql.mutation({
          operation: 'claimEthereumAddress',
          variables: {
            ethereumAddress: { value: ethereumAddress, required: true },
            signature: { value: signature, required: true }
          },
          fields: ['ethereumAddress', 'message', 'claimed']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(mutation)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        const response = res.body.data.claimEthereumAddress;
        expect(response.ethereumAddress).to.equal(ethereumAddress.toLowerCase());
        expect(response.claimed).to.equal(true);
      });
      it('should fail to claim because signature is invalid', async () => {
        const user = await createUser(runningApp);
        await createExternalAddress(runningApp, {ethereumAddress: ethereumAddress.toLowerCase(), user});
        let invalidSignature = signature.substring(0, signature.length - 2) + 'bb';
        const mutation = gql.mutation({
          operation: 'claimEthereumAddress',
          variables: {
            ethereumAddress: { value: ethereumAddress, required: true },
            signature: { value: invalidSignature, required: true }
          },
          fields: ['ethereumAddress', 'message', 'claimed']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(mutation)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        expect(res.body.data.claimEthereumAddress).to.equal(null);
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('Invalid signature v value');
      });
      it('should fail to claim because signature is invalid because signature from incorrect address', async () => {
        const user = await createUser(runningApp);
        await createExternalAddress(runningApp, {ethereumAddress: ethereumAddress.toLowerCase(), user});
        const mutation = gql.mutation({
          operation: 'claimEthereumAddress',
          variables: {
            ethereumAddress: { value: ethereumAddress, required: true },
            signature: { value: '0xf8dd0b94ef23f33cb0e9ee7ce325f70f613fb2cf125f378afa57e81fa6e31eee1247d65c699505f5f2e7808e61c17254343b33b0f4a37edcc98e695349589d301b', required: true }
          },
          fields: ['ethereumAddress', 'message', 'claimed']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(mutation)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        expect(res.body.data.claimEthereumAddress).to.equal(null);
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('invalid signature');
      });
      it('should fail to claim because user not found', async () => {
        const mutation = gql.mutation({
          operation: 'claimEthereumAddress',
          variables: {
            ethereumAddress: { value: ethereumAddress, required: true },
            signature: { value: signature, required: true }
          },
          fields: ['ethereumAddress', 'message', 'claimed']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(mutation)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        expect(res.body.data.claimEthereumAddress).to.equal(null);
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('user not found');
      });
      it('should fail to claim because external wallet not found', async () => {
        const user = await createUser(runningApp);
        await createExternalAddress(runningApp, {user, ethereumAddress: 'banana'});
        const mutation = gql.mutation({
          operation: 'claimEthereumAddress',
          variables: {
            ethereumAddress: { value: ethereumAddress, required: true },
            signature: { value: signature, required: true }
          },
          fields: ['ethereumAddress', 'message', 'claimed']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(mutation)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        expect(res.body.data.claimEthereumAddress).to.equal(null);
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('external wallet not found');
      });
      it('should fail to claim because address is already claimed', async () => {
        const user = await createUser(runningApp);
        await createExternalAddress(runningApp, {ethereumAddress: ethereumAddress.toLowerCase(), user, claimed: true});
        const mutation = gql.mutation({
          operation: 'claimEthereumAddress',
          variables: {
            ethereumAddress: { value: ethereumAddress, required: true },
            signature: { value: signature, required: true }
          },
          fields: ['ethereumAddress', 'message', 'claimed']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(mutation)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        expect(res.body.data.claimEthereumAddress).to.equal(null);
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('external wallet already claimed');
      });
    });
  });

  describe('Queries', () => {
    describe('#get', () => {
      it('should return the users registered external wallet', async () => {
        const user = await createUser(runningApp);
        await createExternalAddress(runningApp, {user, ethereumAddress: ethereumAddress.toLowerCase()});
        const query = gql.query({
          operation: 'getExternalAddress',
          variables: {
            ethereumAddress: { value: ethereumAddress, required: true }
          },
          fields: ['ethereumAddress', 'message']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(query)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        const response = res.body.data.getExternalAddress;
        expect(response.ethereumAddress).to.equal(ethereumAddress.toLowerCase());
        expect(response.message).to.equal('I am signing this nonce: 123456');
      });
      it('should throw user not found when user is not found', async () => {
        const query = gql.query({
          operation: 'getExternalAddress',
          variables: {
            ethereumAddress: { value: ethereumAddress, required: true }
          },
          fields: ['ethereumAddress', 'message']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(query)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        expect(res.body.data.getExternalAddress).to.equal(null);
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('user not found');
      });
      it('should throw external wallet not found', async () => {
        await createUser(runningApp);
        const query = gql.query({
          operation: 'getExternalAddress',
          variables: {
            ethereumAddress: { value: ethereumAddress, required: true }
          },
          fields: ['ethereumAddress', 'message']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(query)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        expect(res.body.data.getExternalAddress).to.equal(null);
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('external wallet not found');
      });
    });

    describe('#list', () => {
      it('should return a list with 1 wallet', async () => {
        const user = await createUser(runningApp);
        await createExternalAddress(runningApp, {user, ethereumAddress: ethereumAddress.toLowerCase(), claimed: true});
        const query = gql.query({
          operation: 'listExternalAddresses',
          fields: ['ethereumAddress']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(query)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        const response = res.body.data.listExternalAddresses;
        expect(response.length).to.equal(1);
        expect(response[0].ethereumAddress).to.equal(ethereumAddress.toLowerCase());
      });
      it('should return a list with no wallets when none attached', async () => {
        await createUser(runningApp);
        const query = gql.query({
          operation: 'listExternalAddresses',
          fields: ['ethereumAddress']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(query)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        const response = res.body.data.listExternalAddresses;
        expect(response.length).to.equal(0);
      });
      it('should throw user not found when no user is found', async () => {
        const query = gql.query({
          operation: 'listExternalAddresses',
          fields: ['ethereumAddress']
        });
        const res = await request(runningApp.app)
            .post('/v1/graphql')
            .send(query)
            .set('Accepts', 'application/json')
            .set('authorization', 'Bearer raiinmaker');
        expect(res.body.data.listExternalAddresses).to.equal(null);
        expect(res.body.errors.length).to.equal(1);
        expect(res.body.errors[0].message).to.equal('user not found');
      });
    });
  });
});
