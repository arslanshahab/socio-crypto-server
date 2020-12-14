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
import { createIdentity, getIdentityLoginRequest, getAccountRecoveryRequest } from './specHelpers';
import {createUser, createProfile} from './specHelpers';
import { Paypal } from '../../src/clients/paypal';
import { Transfer } from '../../src/models/Transfer';
import { ExternalAddress } from '../../src/models/ExternalAddress';
import { getDeterministicId, sha256Hash } from '../../src/util/crypto';
import { Profile } from '../../src/models/Profile';
import { S3Client } from '../../src/clients/s3';

describe('Dragonfactor Integrations Tests', () => {
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
      process.env.RATE_LIMIT_MAX = '1000000000000000';
  };

  before(async () => {
      setEnv();
      fullAppTestbed.stub(Dragonchain, 'initialize');
      fullAppTestbed.stub(Firebase, 'initialize');
      fullAppTestbed.stub(Paypal, 'initialize');
      fullAppTestbed.stub(Paypal, 'refreshToken');
      fullAppTestbed.stub(Dragonchain, 'ledgerAccountRecoveryAttempt');
      fullAppTestbed.stub(S3Client, 'deleteUserInfoIfExists');
      fullAppTestbed.stub(S3Client, 'deleteKycImage');
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

  describe('#login', () => {
    it('should succeed at logging in', async () => {
      const keypair = createIdentity();
      const res = await request(runningApp.app)
        .post('/v1/dragonfactor/login')
        .send({ publicKey: keypair.publicKey, identity: getIdentityLoginRequest(keypair) })
        .set('Accepts', 'application/json');
      expect(res.status).to.equal(200);
      expect(res.body.id).to.equal(getDeterministicId(keypair.publicKey));
      expect(!!res.body.token).to.equal(true);
    });
    it('should return forbidden when the service does not match', async () => {
      const keypair = createIdentity();
      const identityPayload = getIdentityLoginRequest(keypair);
      identityPayload.service = 'banana';
      const res = await request(runningApp.app)
        .post('/v1/dragonfactor/login')
        .send({ publicKey: keypair.publicKey, identity: identityPayload })
        .set('Accepts', 'application/json');
      expect(res.status).to.equal(403);
      expect(res.body.code).to.equal('UNAUTHORIZED');
    });
  });

  describe('#recovery', () => {
    it('should successfully recover account to a new identity', async () => {
      const originalIdentity = createIdentity();
      const newIdentity = createIdentity();
      const profile = await createProfile(runningApp, {username: 'banana', recoveryToken: sha256Hash('123456')});
      await createUser(runningApp, {identityId: getDeterministicId(originalIdentity.publicKey), profile});
      const res = await request(runningApp.app)
        .post('/v1/dragonfactor/recover')
        .send(getAccountRecoveryRequest(newIdentity, '123456', 'banana'))
        .set('Accepts', 'application/json');
      expect(res.body).to.deep.equal({ success: true });
    });
    it('should return malformed input when recovery code is not a number', async () => {
      const originalIdentity = createIdentity();
      const newIdentity = createIdentity();
      const profile = await createProfile(runningApp, {username: 'banana', recoveryToken: sha256Hash('123456')});
      await createUser(runningApp, {identityId: getDeterministicId(originalIdentity.publicKey), profile});
      const res = await request(runningApp.app)
        .post('/v1/dragonfactor/recover')
        .send(getAccountRecoveryRequest(newIdentity, 'abc', 'banana'))
        .set('Accepts', 'application/json');
      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('MALFORMED_INPUT');
    });
    it('should return account conflict when recovery attempt is made with an existing identity', async () => {
      const originalIdentity = createIdentity();
      const profile = await createProfile(runningApp, {username: 'banana', recoveryToken: sha256Hash('123456')});
      await createUser(runningApp, {identityId: getDeterministicId(originalIdentity.publicKey), profile});
      const res = await request(runningApp.app)
        .post('/v1/dragonfactor/recover')
        .send(getAccountRecoveryRequest(originalIdentity, '123456', 'banana'))
        .set('Accepts', 'application/json');
      expect(res.status).to.equal(429);
      expect(res.body.code).to.equal('ACCOUNT_CONFLICT');
    });
    it('should return not found when recovery attempt is made with with incorrect username', async () => {
      const originalIdentity = createIdentity();
      const newIdentity = createIdentity();
      const profile = await createProfile(runningApp, {username: 'banana1', recoveryToken: sha256Hash('123456')});
      await createUser(runningApp, {identityId: getDeterministicId(originalIdentity.publicKey), profile});
      const res = await request(runningApp.app)
        .post('/v1/dragonfactor/recover')
        .send(getAccountRecoveryRequest(newIdentity, '123456', 'banana'))
        .set('Accepts', 'application/json');
      expect(res.status).to.equal(404);
      expect(res.body.code).to.equal('NOT_FOUND');
    });
  });
});
