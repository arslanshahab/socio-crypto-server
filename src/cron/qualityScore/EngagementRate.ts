import {Participant} from "../../models/Participant";
import {BigNumber} from "bignumber.js";
import {Campaign} from "../../models/Campaign";
import {User} from "../../models/User";
import {SocialPost} from "../../models/SocialPost";
import {BN} from '../../util/helpers';
import {SocialLink} from "../../models/SocialLink";


export class EngagementRate {
  participant: Participant;
  campaign: Campaign;
  user: User;
  potentialEngagement: BigNumber;

  postCount: BigNumber;
  followerCount: BigNumber;
  likeCount: BigNumber;
  shareCount: BigNumber;
  commentCount: BigNumber;

  constructor(participant: Participant) {
    this.participant = participant;
    this.campaign = participant.campaign;
    this.user = participant.user;
  }

  async getParticipantSocialData () {
    this.postCount = new BN(await SocialPost.count({where:{campaign: this.campaign, user: this.user, type: 'twitter'}}));
    this.followerCount = new BN((await SocialLink.findOne({where: {user: this.user, type: 'twitter'}}))?.followerCount || 0);
    const {likeCount, shareCount, commentCount} = await User.getUserTotalSocialEngagement(this.user.id);
    this.potentialEngagement = this.postCount.times(this.followerCount);
    this.likeCount = new BN(likeCount);
    this.shareCount = new BN(shareCount);
    this.commentCount = new BN(commentCount);
  }

  async social () {
    await this.getParticipantSocialData();
    return {
      likeRate: this.likeCount.div(this.potentialEngagement),
      shareRate: this.shareCount.div(this.potentialEngagement),
      commentRate: this.commentCount.div(this.potentialEngagement),
      clickRate: this.participant.clickCount.div(this.potentialEngagement)
    }
  }

  views () {
    return this.participant.clickCount.div(this.participant.viewCount);
  }

  submissions () {
    return this.participant.clickCount.div(this.participant.submissionCount);
  }

}
