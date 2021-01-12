import {adjectives, animals, uniqueNamesGenerator} from "unique-names-generator";
import {createConnection, getConnectionOptions} from "typeorm";
import {Campaign} from "../src/models/Campaign";
import {BN, generateRandomNumber} from "../src/util/helpers";
import {
  getBeginDate,
  getEndDate
} from "../test/integration/specHelpers";
import {Org} from "../src/models/Org";
import {HourlyCampaignMetric} from "../src/models/HourlyCampaignMetric";
import {Wallet} from "../src/models/Wallet";
import {Profile} from "../src/models/Profile";
import {User} from "../src/models/User";
import BigNumber from 'bignumber.js';
import {AlgorithmSpecs, Tiers} from "../src/types";
import {SocialPost} from "../src/models/SocialPost";
import { v4 as uuidv4 } from 'uuid';
import {Participant} from "../src/models/Participant";
import {ParticipantMetrics} from "./metricsGenerator";
import {SocialLink} from "../src/models/SocialLink";
import {FundingWallet} from "../src/models/FundingWallet";

export const generateUniqueName = () => {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals]
  });
}

export const getRandomInt = (max: number = 20) => {
  return Math.floor(Math.random() * Math.floor(max));
}

export const getRandomIntWithinRange = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return new BN(Math.floor(Math.random() * (max - min + 1)) + min);
}

export const connectDatabase = async () => {
  const connectionOptions = await getConnectionOptions();
  Object.assign(connectionOptions, { entities: [__dirname + '/../src/models/*'] });
  return await createConnection(connectionOptions);
};

export const incrementHour = (date: Date) => {
  const nextHour = new Date(date);
  nextHour.setUTCHours(date.getUTCHours() + 1);
  return nextHour;
}

export const getTotalHours = (beginDate: Date) => {
  const today = new Date();
  let timeDifference = (today.getTime() - beginDate.getTime()) / 1000;
  timeDifference /= (60 * 60);
  return Math.abs(Math.round(timeDifference));
}

export const generateInterests = () => {
  const interestsArray: string[] = [];
  for (let i = 0; i < 10; i++) {
    interestsArray.push(interests[getRandomInt(interests.length)]);
  }
  return interestsArray;
}

export const generateValues = () => {
  const valuesArray: string[] = [];
  for (let i = 0; i < 10; i++) {
    valuesArray.push(values[getRandomInt(values.length)]);
  }
  return valuesArray;
}

export const generateAgeRange = () => {
  return ageRanges[Number(getRandomInt(ageRanges.length))]
}

export const generateCountry = () => {
  return countries[Number(getRandomInt(countries.length))]
}

export const generateState = () => {
  return states[Number(getRandomInt(states.length))]
}

export const checkFrequency = (num1: number, num2: number) => {
  return num1 > num2 ? num1 % num2 === 0 : num2 % num1 === 0;
}

export const getDailyFrequencies = (maxCount: number = 50, postFrequency: number = 5) => {
  return {
    posts: {
      frequency: getRandomInt(postFrequency),
      likes: getRandomInt(maxCount),
      shares: getRandomInt(maxCount),
      comments: getRandomInt(maxCount),
    },
    clicks: {
      max: getRandomInt(maxCount),
      frequency: getRandomInt(24)
    },
    views: {
      max: getRandomInt(maxCount),
      frequency: getRandomInt(24)
    },
    submissions: {
      max: getRandomInt(maxCount),
      frequency: getRandomInt(24)
    }
  }
}

export const updateParticipant = async (id: string, metrics: ParticipantMetrics) => {
  const participant = await Participant.findOneOrFail({where: {id}});
  participant.clickCount = metrics.clickCount;
  participant.viewCount = metrics.viewCount;
  participant.submissionCount = metrics.submissionCount;
  participant.participationScore = metrics.participationScore;
  await participant.save();
}

interface CampaignUpdate {
  totalParticipationScore?: BigNumber;
  algorithm?: AlgorithmSpecs;
}

export const updateCampaign = async (id: string, data: CampaignUpdate) => {
  const campaign = await Campaign.findOneOrFail({where: {id}});
  if (data.totalParticipationScore) campaign.totalParticipationScore = data.totalParticipationScore;
  if (data.algorithm) campaign.algorithm = data.algorithm;
  await campaign.save();
}

export const generateCampaign = (name: string, org: Org, beginDate?: Date, endDate?: Date) => {
  const campaign = new Campaign();
  campaign.name = name;
  campaign.algorithm = generateAlgorithm();
  campaign.coiinTotal = new BN(  1000);
  campaign.totalParticipationScore = new BN( 45);
  campaign.company = 'Raiinmaker';
  campaign.target = "https://mock-raiinmaker-landing.dragonchain.com";
  campaign.targetVideo = "https://youtube.com";
  campaign.participants = [];
  campaign.posts = [];
  campaign.payouts = [];
  campaign.beginDate = beginDate || getBeginDate();
  campaign.endDate = endDate || getEndDate();
  campaign.dailyMetrics = [];
  campaign.org = org;
  campaign.suggestedTags = [];
  campaign.suggestedPosts = [];
  campaign.hourlyMetrics = [];
  return campaign;
}

export const generateWallet = (org?: Org, user?: User) => {
  const wallet = new Wallet();
  wallet.balance = new BN('1000000000');
  if (user) wallet.user = user;
  return wallet;
}

export const generateOrgIfNotFound = async (name?: string) => {
  let org;
  org = await Org.findOne({where: {name: 'raiinmaker'}});
  if (org) console.log('ORG FOUND', org.id);
  if (!org) {
    org = new Org();
    const fundingWallet = new FundingWallet();
    org.name =  name || 'raiinmaker';
    org.campaigns = [];
    org.transfers = [];
    org.admins = [];
    org.hourlyMetrics = [];
    org.fundingWallet = fundingWallet;

    await org.fundingWallet.save();
    await org.save();
  }
  return org;
}

export const generateSocialPost = (
  {
    likes,
    shares,
    comments,
    participantId,
    campaign,
    user
  }: {
    likes: BigNumber;
    shares: BigNumber;
    comments: BigNumber;
    participantId: string;
    campaign: Campaign;
    user: User;
  }) => {
  const post = new SocialPost();
  post.id = uuidv4();
  post.likes = likes;
  post.shares = shares;
  post.comments = comments;
  post.participantId = participantId;
  post.campaign = campaign;
  post.user = user;
  return post;
}

export const generateProfile = (username?: string) => {
  const profile = new Profile();
  profile.username = username || generateUniqueName();
  profile.email = `${generateUniqueName()}@gmail.com`;
  profile.interests = generateInterests();
  profile.ageRange = generateAgeRange();
  profile.state = generateState();
  profile.country = generateCountry();
  profile.values = generateValues();
  return profile;
}

export const generateUser = (profile: Profile, socialLink: SocialLink, wallet?: Wallet) => {
  const user = new User();
  user.identityId = 'banana';
  user.profile = profile;
  user.active =  true;
  user.posts = [];
  user.campaigns = [];
  user.wallet = wallet || generateWallet();
  user.socialLinks = [socialLink];
  user.factorLinks = [];
  user.twentyFourHourMetrics = [];
  return user;
}

export const generateSocialLink = () => {
  const link = new SocialLink();
  link.type = 'twitter';
  link.apiKey = 'bacon';
  link.apiSecret = 'salad';
  link.followerCount = generateRandomNumber();
  return link;
}

export const generateHourlyCampaignMetric = (
  {
    campaign,
    org,
    postCount,
    participantCount,
    clickCount,
    viewCount,
    submissionCount,
    likeCount,
    shareCount,
    commentCount,
    createdAt
  }: {
    campaign: Campaign;
    org: Org;
    postCount: BigNumber;
    participantCount: BigNumber;
    clickCount: BigNumber;
    viewCount: BigNumber;
    submissionCount: BigNumber;
    likeCount: BigNumber;
    shareCount: BigNumber;
    commentCount: BigNumber;
    createdAt: Date;
  }) => {
  const hourlyMetric = new HourlyCampaignMetric();
  hourlyMetric.campaign = campaign;
  hourlyMetric.org = org;
  hourlyMetric.postCount = postCount;
  hourlyMetric.participantCount = participantCount;
  hourlyMetric.clickCount = clickCount;
  hourlyMetric.viewCount = viewCount;
  hourlyMetric.submissionCount = submissionCount;
  hourlyMetric.likeCount = likeCount;
  hourlyMetric.shareCount = shareCount;
  hourlyMetric.commentCount = commentCount;
  hourlyMetric.createdAt = createdAt;
  return hourlyMetric;
}

const getThresholds = (total: BigNumber) => {
  const thresholds: BigNumber[] = []
  const maximums = [total.times(0.2), total.times(0.4), total.times(0.6), total.times(0.8), total, total.times(1.2), total.times(1.4), total.times(1.6), total.times(1.8), total.times(2.0)]
  for (let i = 0; i < 10; i++) {
    const min = i === 0 ? 0 : thresholds[i-1];
    const max = maximums[i];
    thresholds.push(getRandomIntWithinRange(Number(min), Number(max)));
  }
  return thresholds;
}

export const generateAlgorithm = (totalScore?: BigNumber) => {
  let tiers: Tiers;
  if (totalScore) {
    const thresholdArray = getThresholds(totalScore);
    tiers = {
      '1':{
        threshold: thresholdArray[0],
        totalCoiins: getRandomIntWithinRange(5000, 10000),
      },
      '2':{
        threshold: thresholdArray[1],
        totalCoiins: getRandomIntWithinRange(15000, 20000),
      },
      '3':{
        threshold: thresholdArray[2],
        totalCoiins: getRandomIntWithinRange(25000, 30000),
      },
      '4':{
        threshold: thresholdArray[3],
        totalCoiins: getRandomIntWithinRange(35000, 40000),
      },
      '5':{
        threshold: thresholdArray[4],
        totalCoiins: getRandomIntWithinRange(25000, 30000),
      },
      '6':{
        threshold: thresholdArray[5],
        totalCoiins: getRandomIntWithinRange(35000, 40000),
      },
      '7':{
        threshold: thresholdArray[6],
        totalCoiins: getRandomIntWithinRange(45000, 50000),
      },
      '8':{
        threshold: thresholdArray[7],
        totalCoiins: getRandomIntWithinRange(55000, 60000),
      },
      '9':{
        threshold: thresholdArray[8],
        totalCoiins: getRandomIntWithinRange(65000, 70000),
      },
      '10':{
        threshold: thresholdArray[9],
        totalCoiins: getRandomIntWithinRange(75000, 100000),
      }
    }
  } else {
      tiers = {
      '1':{
        threshold: new BN(10),
        totalCoiins: new BN(10),
      },
      '2':{
        threshold: new BN(20),
        totalCoiins: new BN(20),
      },
      '3':{
        threshold: new BN(30),
        totalCoiins: new BN(30),
      },
      '4':{
        threshold: new BN(40),
        totalCoiins: new BN(40),
      },
      '5':{
        threshold: new BN(50),
        totalCoiins: new BN(50),
      }}
  }
  return {
    version: 1,
    initialTotal: new BN( 10),
    tiers,
    pointValues:{
      clicks: new BN(1),
      views: new BN(1),
      submissions: new BN(1),
      likes: new BN(1),
      shares: new BN(1),
    }
  }
}

export const interests = [
  "Art & Design",
  "Automotive",
  "Beauty",
  "Business",
  "Education",
  "Entertainment",
  "Family",
  "Fashion",
  "Food & Drink",
  "Health & Fitness",
  "Home & Garden",
  "Restaurants, Bars & Hotels",
  "Social Justice & Non-Profit",
  "Travel & Destinations",
  "Web & Tech",
];

export const values = [
  "Authenticity",
  "Achievement",
  "Adventure",
  "Authority",
  "Balance",
  "Beauty",
  "Boldness",
  "Compassion",
  "Citizenship",
  "Community",
  "Competency",
  "Competition",
  "Contribution",
  "Creativity",
  "Curiosity",
  "Determination",
  "Diversity",
  "Fairness",
  "Faith",
  "Fame",
  "Friendships",
  "Fun",
  "Growth",
  "Happiness",
  "Honesty",
  "Humor",
  "Humble",
  "Independence",
  "Influence",
  "Integrity",
  "Inner Harmony",
  "Innovation",
  "Justice",
  "Kindness",
  "Knowledge",
  "Leadership",
  "Learning",
  "Love",
  "Loyalty",
  "Meaningful Work",
  "Openness",
  "Optimism",
  "Passion",
  "Peace",
  "Pleasure",
  "Popularity",
  "Recognition",
  "Reputation",
  "Respect",
  "Responsibility",
  "Security",
  "Self-Respect",
  "Service",
  "Spirituality",
  "Stability",
  "Success",
  "Sustainability",
  "Trustworthiness",
  "Wealth",
  "Wisdom"
];

export const ageRanges = [
  "0-17",
  "18-25",
  "26-40",
  "41-55",
  "55+",
];

export const countries = [
  "United States",
  "Afghanistan",
  "Albania",
  "Algeria",
  "American Samoa",
  "Andorra",
  "Angola",
  "Anguilla",
  "Antarctica",
  "Antigua And Barbuda",
  "Argentina",
  "Armenia",
  "Aruba",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bermuda",
  "Bhutan",
  "Bolivia",
  "Bosnia And Herzegovina",
  "Botswana",
  "Bouvet Island",
  "Brazil",
  "Brunei Darussalam",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Cayman Islands",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Christmas Island",
  "Cocos Islands",
  "Colombia",
  "Comoros",
  "Congo",
  "The Democratic Republic Of The Congo",
  "Cook Islands",
  "Costa Rica",
  "Cote D'ivoire",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "East Timor",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Ethiopia",
  "Falkland Islands",
  "Faroe Islands",
  "Fiji",
  "Finland",
  "France",
  "French Guiana",
  "French Polynesia",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Gibraltar",
  "Greece",
  "Greenland",
  "Grenada",
  "Guadeloupe",
  "Guam",
  "Guatemala",
  "Guinea",
  "Guinea-bissau",
  "Guyana",
  "Haiti",
  "Vatican City",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakstan",
  "Kenya",
  "Kiribati",
  "South Korea",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Lao People's Democratic Republic",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libyan Arab Jamahiriya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Macau",
  "The Former Yugoslav Republic Of Macedonia",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Martinique",
  "Mauritania",
  "Mauritius",
  "Mayotte",
  "Mexico",
  "Federated States Of Micronesia",
  "Republic Of Moldova",
  "Monaco",
  "Mongolia",
  "Montserrat",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "Netherlands Antilles",
  "New Caledonia",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Niue",
  "Norfolk Island",
  "Northern Mariana Islands",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Pitcairn",
  "Poland",
  "Portugal",
  "Puerto Rico",
  "Qatar",
  "Reunion",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Helena",
  "Saint Kitts And Nevis",
  "Saint Lucia",
  "Saint Pierre And Miquelon",
  "Saint Vincent And The Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Georgia",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Svalbard And Jan Mayen",
  "Swaziland",
  "Sweden",
  "Switzerland",
  "Syrian Arab Republic",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tokelau",
  "Tonga",
  "Trinidad And Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Turks And, Caicos Islands",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab, Emirates",
  "United Kingdom",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Venezuela",
  "Vietnam",
  "Virgin Islands, British",
  "Virgin Islands, U.S.",
  "Wallis And, Futuna",
  "Western Sahara",
  "Yemen",
  "Zambia",
  "Zimbabwe"
];

export const states = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];
