import {Campaign} from "../../models/Campaign";
import {TwitterClient} from "../../clients/twitter";
import {SocialPost} from "../../models/SocialPost";
import {getConnection} from "typeorm";
import { Secrets } from '../../util/secrets';
import { Application } from '../../app';
import logger from "../../util/logger";
import {SocialLink} from "../../models/SocialLink";
import {Participant} from "../../models/Participant";
import { BigNumber } from 'bignumber.js';
import {BN, calculateQualityMultiplier} from '../../util/helpers';
import { DailyParticipantMetric } from '../../models/DailyParticipantMetric';
import {HourlyCampaignMetric} from "../../models/HourlyCampaignMetric";
import {QualityScore} from "../../models/QualityScore";

const app = new Application();

const updatePostMetrics = async (likes: BigNumber, shares: BigNumber, post: SocialPost) => {
    const participant = await Participant.findOne({where:{campaign: post.campaign, user: post.user}, relations: ['campaign', 'user']});
    if (!participant) throw new Error('participant not found');
    const campaign = await Campaign.findOne({ where: { id: participant.campaign.id }, relations: ['org'] });
    if (!campaign) throw new Error('campaign not found');
    let qualityScore = await QualityScore.findOne({where: {participantId: participant.id}});
    if (!qualityScore) qualityScore = QualityScore.newQualityScore(participant.id);
    const likesMultiplier = calculateQualityMultiplier(qualityScore.likes);
    const sharesMultiplier = calculateQualityMultiplier(qualityScore.shares);
    const likesAdjustedScore = (likes.minus(post.likes)).times(post.campaign.algorithm.pointValues.likes).times(likesMultiplier);
    const sharesAdjustedScore = (shares.minus(post.shares)).times(post.campaign.algorithm.pointValues.shares).times(sharesMultiplier);
    campaign.totalParticipationScore = campaign.totalParticipationScore.plus(likesAdjustedScore.plus(sharesAdjustedScore));
    participant.participationScore = participant.participationScore.plus(likesAdjustedScore.plus(sharesAdjustedScore));
    post.likes = likes;
    post.shares = shares;
    await participant.save();
    await campaign.save();
    await qualityScore.save();
    await HourlyCampaignMetric.upsert(campaign, campaign.org, 'likes', likes.minus(post.likes).toNumber());
    await HourlyCampaignMetric.upsert(campaign, campaign.org, 'shares', shares.minus(post.shares).toNumber());
    await DailyParticipantMetric.upsert(participant.user, campaign, participant, 'likes', likesAdjustedScore, likes.minus(post.likes).toNumber());
    await DailyParticipantMetric.upsert(participant.user, campaign, participant, 'shares', sharesAdjustedScore, shares.minus(post.shares).toNumber());
    return post;
}

(async () => {
    logger.info('Starting Cron.');
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    logger.info('Database connected');
    let postsToSave: SocialPost[] = [];
    const campaigns = await Campaign.find({relations: ['posts']});
    for(const campaign of campaigns) {
        if (campaign.isOpen()) {
            const posts = await SocialPost.find({where: {campaign}, relations: ['user', 'campaign']});
            for(const post of posts) {
                const socialLink = await SocialLink.findOne({where: {user: post.user, type:post.type}, relations: ['user']})
                if (!socialLink) {
                    logger.error(`participant ${post.user.id} has not linked ${post.type} as a social platform`);
                } else {
                    try {
                        const response = await TwitterClient.get(socialLink.asClientCredentials(), post.id, false);
                        const responseJSON = JSON.parse(response);
                        const updatedPost = await updatePostMetrics(new BN(responseJSON['favorite_count']), new BN(responseJSON['retweet_count']), post);
                        logger.info(`pushing new metrics on social post for campaign: ${post.campaign.name}`);
                        postsToSave.push(updatedPost);
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
    }
    logger.info('saving entities');
    await getConnection().createEntityManager().save(postsToSave);
    logger.info('closing connection');
    await connection.close();
    process.exit(0);
})()


