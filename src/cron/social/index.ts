import {Campaign} from "../../models/Campaign";
import {TwitterClient} from "../../clients/twitter";
import {SocialPost} from "../../models/SocialPost";
import {getConnection} from "typeorm";
import { Secrets } from '../../util/secrets';
import { Application } from '../../app';
import logger from "../../util/logger";
import {SocialLink} from "../../models/SocialLink";
import {Participant} from "../../models/Participant";

const app = new Application();

const updatePostMetrics = async (likes: number, shares: number, post: SocialPost) => {
    const participant = await Participant.findOne({where:{campaign: post.campaign, user: post.user}});
    if (!participant) throw new Error('participant not found');
    const likesAdjustedScore = (likes - post.likes) * post.campaign.algorithm.pointValues.likes;
    const sharesAdjustedScore = (shares - post.shares) * post.campaign.algorithm.pointValues.shares;
    post.campaign.totalParticipationScore = BigInt(post.campaign.totalParticipationScore) + BigInt(likesAdjustedScore + sharesAdjustedScore);
    participant.participationScore = BigInt(participant.participationScore) + BigInt(likesAdjustedScore + sharesAdjustedScore);
    post.likes = likes;
    post.shares = shares;
    await participant.save();
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
                    const {retweet_count, favorite_count} = await TwitterClient.get(socialLink.asClientCredentials(), post.id, false);
                    const updatedPost = await updatePostMetrics(favorite_count, retweet_count, post);
                    logger.info(`pushing new metrics on social post for campaign: ${post.campaign.name}`);
                    postsToSave.push(updatedPost);
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


