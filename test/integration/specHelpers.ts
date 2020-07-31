import { Campaign } from '../../src/models/Campaign';
import { Application } from '../../src/app';
import {Participant} from "../../src/models/Participant";
import {User} from "../../src/models/User";
import {Wallet} from "../../src/models/Wallet";
import { v4 as uuidv4 } from 'uuid';
import {Transfer} from "../../src/models/Transfer";
import { BN } from '../../src/util/helpers';
import { Profile } from '../../src/models/Profile';

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
  return await runningApp.databaseConnection.createEntityManager().save(campaign);
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

export const createUser = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const user = new User();
  user.identityId = getValue(['identityId'], options) || 'banana';
  user.profile = getValue(['profile'], options) || await createProfile(runningApp, getValue(['profileOptions'], options));
  user.active = getValue(['active'], options) || true;
  user.posts = getValue(['posts'], options) || [];
  user.campaigns = getValue(['campaigns'], options) || [];
  user.wallet = getValue(['wallet'], options) || await createWallet(runningApp, getValue(['walletOptions'], options))
  user.socialLinks = getValue(['socialLinks'], options) || [];
  user.factorLinks = getValue(['factorLinks'], options) || [];
  user.twentyFourHourMetrics = getValue(['twentyFourHourMetrics'], options) || []
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
  profile.followerAgeRanges = getValue(['followerAgeRanges'], options, []);
  profile.followerInterests = getValue(['followerInterests'], options, []);
  return await runningApp.databaseConnection.createEntityManager().save(profile);
}

export const createTransfer = async (runningApp: Application, options?: { [key: string]: any } | any) => {
  const transfer = new Transfer();
  transfer.amount = new BN(getValue(['amount'], options, 100));
  transfer.action = getValue(['action'], options) || 'transfer';
  transfer.withdrawStatus = getValue(['withdrawStatus'], options) || 'approved';
  transfer.wallet = getValue(['wallet'], options) || await createWallet(runningApp);
  transfer.campaign = getValue(['campaign'], options) || await createCampaign(runningApp);
  return await runningApp.databaseConnection.createEntityManager().save(transfer);
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
    date.setUTCDate(date.getUTCDate() - 2);
    return date;
  })());
}

export const getEndDate = (endDate?: string) => {
  return new Date(endDate || (() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 1);
    return date;
  })());
}
