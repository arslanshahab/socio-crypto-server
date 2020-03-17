import { Campaign } from '../models/Campaign';
import { User } from '../models/User';

export const root = {
  helloWorld: () => 'Hello world!',
  participate: User.participate,
  newUser: User.signUp,
  newCampaign: Campaign.newCampaign,
  listCampaigns: Campaign.list,
  me: User.me,
};