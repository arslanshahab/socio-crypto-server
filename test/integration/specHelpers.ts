import { randomBytes } from 'crypto';
import * as secp256k1 from 'secp256k1';
import { Campaign } from '../../src/models/Campaign';
import {Participant} from "../../src/models/Participant";
import {User} from "../../src/models/User";
import {Wallet} from "../../src/models/Wallet";
import { v4 as uuidv4 } from 'uuid';
import {Transfer} from "../../src/models/Transfer";
import { BN } from '../../src/util/helpers';
import { Profile } from '../../src/models/Profile';
import { DailyParticipantMetric } from '../../src/models/DailyParticipantMetric';
import { ExternalAddress } from '../../src/models/ExternalAddress';
import { getDeterministicId, sha256Hash } from '../../src/util/crypto';
import { NotificationSettings } from '../../src/models/NotificationSettings';
import {Application} from "../../src/app";
import {Org} from "../../src/models/Org";
import {SocialPost} from "../../src/models/SocialPost";
import {SocialLink} from "../../src/models/SocialLink";
import {getRandomIntWithinRange} from "../../scripts/helpers";
import { RafflePrize } from '../../src/models/RafflePrize';

export const createCampaign = async (runningApp: Application, options?: { [key: string]: any } | any, ) => {
  const campaign = new Campaign();
  campaign.name = getValue(['name'], options,  'bananaCampaign')
  campaign.algorithm = getAlgorithm(getValue(['algorithm'], options));
  campaign.coiinTotal = new BN(getValue(['coiinTotal'], options,  1000));
  campaign.totalParticipationScore = new BN(getValue(['totalParticipationScore'], options, 45));
  campaign.company = getValue(['company'], options,   'raiinmaker');
  campaign.target = getValue(['target'], options,   "https://mock-raiinmaker-landing.dragonchain.com");
  campaign.targetVideo = getValue(['targetVideo'], options,   "https://youtube.com");
  campaign.participants = getValue(['participants'], options,   []);
  campaign.posts = getValue(['posts'], options,[]);
  campaign.payouts = getValue(['payouts'], options,[]);
  campaign.beginDate = getBeginDate(getValue(['startDate'], options));
  campaign.endDate = getEndDate(getValue(['endDate'], options));
  campaign.dailyMetrics = getValue(['dailyMetrics'], options);
  campaign.org = getValue(['org'], options, await createOrg(runningApp));
  campaign.suggestedTags = getValue(['suggestedTags'], options, []);
  campaign.suggestedPosts = getValue(['suggestedPosts'], options, []);
  campaign.type = getValue(['type'], options, 'coiin');
  return await runningApp.databaseConnection.createEntityManager().save(campaign);
}

export const createRafflePrize = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const prize = new RafflePrize();
  prize.displayName = getValue(['displayName'], options);
  prize.campaign = getValue(['campaign'], options) || await createCampaign(runningApp);
  return await runningApp.databaseConnection.createEntityManager().save(prize);
}

export const createDailyParticipantMetric = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const dailyMetric = new DailyParticipantMetric();
  dailyMetric.clickCount = getValue(['clickCount'], options, new BN(0));
  dailyMetric.viewCount = getValue(['viewCount'], options, new BN(0));
  dailyMetric.submissionCount = getValue(['submissionCount'], options, new BN(0));
  dailyMetric.likeCount = getValue(['likeCount'], options, new BN(0));
  dailyMetric.shareCount = getValue(['shareCount'], options, new BN(0));
  dailyMetric.commentCount = getValue(['commentCount'], options, new BN(0));
  dailyMetric.participationScore = getValue(['participationScore'], options, new BN(0));
  dailyMetric.totalParticipationScore = getValue(['totalParticipationScore'], options, new BN(0));
  dailyMetric.participantId = getValue(['participantId'], options, new BN(0));

}

export const createOrg = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const org = new Org();
  org.name = getValue(['name'], options, 'Raiinmaker');
  org.campaigns = getValue(['campaigns'], options, []);
  org.transfers = getValue(['transfers'], options, []);
  org.admins = getValue(['admins'], options, []);
  return await runningApp.databaseConnection.createEntityManager().save(org);
}

export const createParticipant = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const participant = new Participant();
  participant.clickCount = new BN(getValue(['clickCount'], options,   5));
  participant.viewCount = new BN(getValue(['viewCount'], options,   5));
  participant.submissionCount = new BN(getValue(['submissionCount'], options,   5));
  participant.participationScore = new BN(getValue(['participationScore'], options,15));
  participant.user = getValue(['user'], options) || await createUser(runningApp, getValue(['userOptions'], options));
  participant.campaign = getValue(['campaign'], options) || await createCampaign(runningApp, getValue(['campaignOptions'], options));
  return await runningApp.databaseConnection.createEntityManager().save(participant);
}

export const createSocialPost = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const post = new SocialPost();
  post.id = uuidv4();
  post.type = getValue(['type'], options, 'twitter');
  post.likes = getValue(['likes'], options, new BN(10));
  post.shares = getValue(['shares'], options, new BN(10));
  post.comments = getValue(['comments'], options, new BN(10));
  post.participantId = getValue(['participantId'], options, 'bacon');
  post.user = getValue(['user'], options) || await createUser(runningApp);
  post.campaign = getValue(['campaign'], options) || await createCampaign(runningApp);
  return await runningApp.databaseConnection.createEntityManager().save(post);
}

export const createDailyMetrics = async (runningApp: Application, options: { [key: string]: any } | any) => {
  const metric = new DailyParticipantMetric();
  metric.campaign = getValue(['campaign'], options) || await createCampaign(runningApp, getValue(['campaignOptions'], options));
  metric.user = getValue(['user'], options) || await createUser(runningApp, getValue(['userOptions'], options));
  metric.clickCount = getValue(['clickCount'], options) || new BN(0);
  metric.viewCount = getValue(['viewCount'], options) || new BN(0);
  metric.submissionCount = getValue(['submissionCount'], options) || new BN(0);
  metric.likeCount = getValue(['likeCount'], options) || new BN(0);
  metric.shareCount = getValue(['shareCount'], options) || new BN(0);
  metric.commentCount = getValue(['commentCount'], options) || new BN(0);
  metric.participationScore = getValue(['participationScore'], options) || new BN(0);
  metric.totalParticipationScore = getValue(['totalParticipationScore'], options) || new BN(0);
  metric.participantId = getValue(['participantId'], options) || (await createParticipant(runningApp)).id;
  metric.createdAt = getValue(['createdAt'], options);
  return await runningApp.databaseConnection.createEntityManager().save(metric);
}

export const createNotificationSettings = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const notificationSettings = new NotificationSettings();
  notificationSettings.kyc = getValue(['kyc'], options, true);
  notificationSettings.withdraw = getValue(['withdraw'], options, true);
  notificationSettings.campaignCreate = getValue(['campaignCreate'], options, true);
  notificationSettings.campaignUpdates = getValue(['campaignUpdates'], options, true);
  return await runningApp.databaseConnection.createEntityManager().save(notificationSettings);
}

export const createSocialLink = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const socialLink = new SocialLink();
  socialLink.type = getValue(['type'], options) || 'twitter';
  socialLink.apiSecret = getValue(['apiSecret'], options) || 'banana';
  socialLink.apiKey = getValue(['apiKey'], options) || 'bacon';
  socialLink.followerCount = getValue(['followerCount'], options) || 100;
  socialLink.user = getValue(['user'], options) || await createUser(runningApp, getValue(['userOptions'], options));
  return await runningApp.databaseConnection.createEntityManager().save(socialLink);
}

export const createUser = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const user = new User();
  user.identityId = getValue(['identityId'], options) || 'banana';
  user.profile = getValue(['profile'], options) || await createProfile(runningApp, getValue(['profileOptions'], options));
  user.active = getValue(['active'], options) || true;
  user.posts = getValue(['posts'], options) || [];
  user.campaigns = getValue(['campaigns'], options) || [];
  user.wallet = getValue(['wallet'], options) || await createWallet(runningApp, getValue(['walletOptions'], options));
  user.socialLinks = getValue(['socialLinks'], options) || [];
  user.factorLinks = getValue(['factorLinks'], options) || [];
  user.twentyFourHourMetrics = getValue(['twentyFourHourMetrics'], options) || [];
  user.notificationSettings = getValue(['notificationSettings'], options) || await createNotificationSettings(runningApp, getValue(['notificationOptions'], options));
  await runningApp.databaseConnection.createEntityManager().save(user);
  return user;
}

export const createWallet = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const wallet = new Wallet();
  wallet.balance = new BN(getValue(['balance'], options, 10000));
  wallet.transfers = getValue(['transfers'], options, []);
  return await runningApp.databaseConnection.createEntityManager().save(wallet);
}

export const createProfile = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const profile = new Profile();
  profile.email = getValue(['email'], options, 'email');
  profile.username = getValue(['username'], options, uuidv4());
  profile.recoveryCode = getValue(['recoveryToken'], options, 'recoveryToken');
  profile.deviceToken = getValue(['deviceToken'], options, 'deviceToken');
  profile.interests = getValue(['interests'], options, []);
  profile.city = getValue(['city'], options);
  profile.state = getValue(['state'], options);
  return await runningApp.databaseConnection.createEntityManager().save(profile);
}

export const createTransfer = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const transfer = new Transfer();
  transfer.amount = new BN(getValue(['amount'], options, 100));
  transfer.action = getValue(['action'], options) || 'transfer';
  transfer.withdrawStatus = getValue(['withdrawStatus'], options) || 'approved';
  transfer.wallet = getValue(['wallet'], options) || await createWallet(runningApp);
  transfer.campaign = getValue(['campaign'], options) || await createCampaign(runningApp);
  transfer.ethAddress = getValue(['ethAddress'], options);
  return await runningApp.databaseConnection.createEntityManager().save(transfer);
};

export const createExternalAddress = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const externalWallet = new ExternalAddress();
  externalWallet.fundingWallet = getValue(['fundingWallet'], options);
  externalWallet.user = getValue(['user'], options);
  externalWallet.ethereumAddress = getValue(['ethereumAddress'], options) || '0x0000000000000000000000000000000000000000';
  externalWallet.claimMessage = getValue(['claimMessage'], options) || 'I am signing this nonce: 123456';
  externalWallet.claimed = getValue(['claimed'], options) || false;
  return await runningApp.databaseConnection.createEntityManager().save(externalWallet);
};

export const getAlgorithm = (options?: { [key: string]: any } | any) => {
  return {
    "version": 1,
    "initialTotal": new BN(getValue(['initialTotal'], options, 10)),
    "tiers":{
      "1":{
        "threshold": new BN(getValue(['tiers','1','threshold'], options, 10)),
        "totalCoiins": new BN(getValue(['tiers', '1', 'totalCoiins'], options, 10)),
      },
      "2":{
        "threshold": new BN(getValue(['tiers','2', 'threshold'], options, 20)),
        "totalCoiins": new BN(getValue(['tiers', '2','totalCoiins'], options, 20)),
      },
      "3":{
        "threshold": new BN(getValue(['tiers', '3', 'threshold'], options, 30)),
        "totalCoiins": new BN(getValue(['tiers', '3', 'totalCoiins'], options, 30)),
      },
      "4":{
        "threshold": new BN(getValue(['tiers', '4', 'threshold'], options, 40)),
        "totalCoiins": new BN(getValue(['tiers', '4', 'totalCoiins'], options, 40)),
      },"5":{
        "threshold": new BN(getValue(['tiers', '5', 'threshold'], options, 50)),
        "totalCoiins": new BN(getValue(['tiers', '5', 'totalCoiins'], options, 50)),
      }},
    "pointValues":{
      "click": new BN(getValue(['pointValues', 'click'], options, 1)),
      "view": new BN(getValue(['pointValues', 'view'], options, 1)),
      "submission": new BN(getValue(['pointValues', 'submission'], options, 1)),
      "likes": new BN(getValue(['pointValues', 'likes'], options, 1)),
      "shares": new BN(getValue(['pointValues', 'view'], options, 1)),
    }
  };
};

const getValue = (indexes: string[], options: { [key: string]: any }, defaultValue?: any) => {
  if (indexes.length > 3) throw Error('Cannot have more than three indexes');
  try {
    const keysLength = indexes.length
    let value;
    if (keysLength === 1) {
      value = options[indexes[0]]
    } else if (keysLength === 2) {
      value = options[indexes[0]][indexes[1]]
    } else if (keysLength === 3) {
      value = options[indexes[0]][indexes[1]][indexes[2]]
    }
    if (value === undefined) return defaultValue;
    return value;
  } catch (e) {
    return defaultValue;
  }
}

export const getBeginDate = (startDate?: string) => {
  return new Date(startDate || (() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 1);
    return date;
  })());
}

export const getEndDate = (endDate?: string) => {
  return new Date(endDate || (() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 10);
    return date;
  })());
}

export interface IdentityKeyPair {
  publicKey: string;
  privateKey: string;
  sign?: Function;
}

const newKeypair = (): IdentityKeyPair => {
  let privKey: Buffer;
  do { privKey = randomBytes(32); }
  while (!secp256k1.privateKeyVerify(privKey));
  return {
    publicKey: Buffer.from(secp256k1.publicKeyCreate(privKey)).toString('base64'),
    privateKey: privKey.toString('base64')
  }
}

const orderedListForIdentityLogin = (keypair: IdentityKeyPair, signature: string, timestamp: Date) => {
  const hashBufList: Buffer[] = [];
  hashBufList.push(Buffer.from('raiinmaker', 'utf8'));
  hashBufList.push(Buffer.from(new Date(timestamp).toISOString(), 'utf8'));
  hashBufList.push(Buffer.from(keypair.publicKey, 'utf8'));
  hashBufList.push(Buffer.from('secp256k1', 'utf8'));
  hashBufList.push(Buffer.from(getDeterministicId(keypair.publicKey), 'utf8'));
  hashBufList.push(Buffer.from(signature, 'utf8'));
  return hashBufList;
}

const orderedListForAccountRecovery = (keypair: IdentityKeyPair, recoveryCode: string, recoveryMessage: string, timestamp: Date) => {
  const hashBufList: Buffer[] = [];
  hashBufList.push(Buffer.from('raiinmaker', 'utf8'));
  hashBufList.push(Buffer.from(new Date(timestamp).toISOString(), 'utf8'));
  hashBufList.push(Buffer.from(recoveryCode, 'utf8'));
  hashBufList.push(Buffer.from(recoveryMessage, 'utf8'));
  return hashBufList;
}

export const getAccountRecoveryRequest = (keypair: IdentityKeyPair, recoveryCode: string, recoveryMessage: string) => {
  const timestamp = new Date();
  const structure: any = {
    service: 'raiinmaker',
    publicKey: keypair.publicKey,
    timestamp: timestamp.toISOString(),
    recoveryCode,
    recoveryMessage
  };
  if (keypair.sign)
    structure.signature = keypair.sign(sha256Hash(Buffer.concat(orderedListForAccountRecovery(keypair, recoveryCode, recoveryMessage, timestamp))));
  return structure;
}

export const getIdentityLoginRequest = (keypair: IdentityKeyPair) => {
  const timestamp = new Date().toISOString();
  const structure: any = {
    service: 'raiinmaker',
    timestamp,
    identity: {
      publicKey: keypair.publicKey,
      keyType: 'secp256k1',
      signature: {
        signingKeyId: getDeterministicId(keypair.publicKey),
      }
    }
  };
  if (keypair.sign) {
    structure.identity.signature.signature = keypair.sign(sha256Hash(Buffer.from(keypair.publicKey, 'utf8')));
    structure.signature = keypair.sign(sha256Hash(Buffer.concat(orderedListForIdentityLogin(keypair, structure.identity.signature.signature, new Date(timestamp)))));
  }
  return structure;
}

export const createIdentity = (): IdentityKeyPair => {
  const keypair = newKeypair();
  keypair.sign = (hashedMessage: any) => Buffer.from(secp256k1.ecdsaSign(Buffer.from(hashedMessage, 'base64'), Buffer.from(keypair.privateKey, 'base64')).signature).toString('base64');
  return keypair;
}


export const generateParticipation = async (runningApp: Application, campaign: Campaign, outlier: boolean = false) => {
  const clickCount = outlier ? getRandomIntWithinRange(100000, 500000) : getRandomIntWithinRange(10, 1000);
  const viewCount = getRandomIntWithinRange(10, 1000);
  const submissionCount = getRandomIntWithinRange(10, 1000);
  const likes = outlier ? getRandomIntWithinRange(100000, 500000) : getRandomIntWithinRange(10, 1000);
  const shares = outlier ? getRandomIntWithinRange(100000, 500000) : getRandomIntWithinRange(10, 1000);
  const comments = outlier ? getRandomIntWithinRange(100000, 500000) : getRandomIntWithinRange(10, 1000);
  const user = await createUser(runningApp);
  await createSocialLink(runningApp, {user, followerCount: 100});
  const participant = await createParticipant(runningApp, {user, campaign, clickCount, viewCount, submissionCount});
  await createSocialPost(runningApp, {
    likes,
    shares,
    comments,
    participantId: participant.id,
    user,
    campaign,
  })
  await createSocialPost(runningApp, {
    likes,
    shares,
    comments,
    participantId: participant.id,
    user,
    campaign,
  })
  await createSocialPost(runningApp, {
    likes,
    shares,
    comments,
    participantId: participant.id,
    user,
    campaign,
  })
  return participant.id;
}
