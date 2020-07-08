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
import { BN } from 'src/util/helpers';

const app = new Application();

const updatePostMetrics = async (likes: BigNumber, shares: BigNumber, post: SocialPost) => {
    const participant = await Participant.findOne({where:{campaign: post.campaign, user: post.user}, relations: ['campaign']});
    if (!participant) throw new Error('participant not found');
    const campaign = await Campaign.findOne({ where: { id: participant.campaign.id } });
    if (!campaign) throw new Error('campaign not found');
    const likesAdjustedScore = (likes.minus(post.likes)).times(post.campaign.algorithm.pointValues.likes);
    const sharesAdjustedScore = (shares.minus(post.shares)).times(post.campaign.algorithm.pointValues.shares);
    campaign.totalParticipationScore = campaign.totalParticipationScore.plus(likesAdjustedScore.plus(sharesAdjustedScore));
    participant.participationScore = participant.participationScore.plus(likesAdjustedScore.plus(sharesAdjustedScore));
    post.likes = likes;
    post.shares = shares;
    await participant.save();
    await campaign.save();
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


