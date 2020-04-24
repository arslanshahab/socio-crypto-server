import {Campaign} from "../../models/Campaign";
import {TwitterClient} from "../../clients/twitter";
import {SocialPost} from "../../models/SocialPost";
import {getConnection} from "typeorm";
import { Secrets } from '../../util/secrets';
import { Application } from '../../app';
import logger from "../../util/logger";
import {User} from "../../models/User";

const app = new Application();

(async () => {
    logger.info('Starting Cron.');
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    logger.info('Database connected');
    let postsToSave: SocialPost[] = [];
    const campaigns = await Campaign.find({relations: ['posts']});
    console.log('Campaigns -->>> ', campaigns);
    for(const campaign of campaigns) {
        if (campaign.isOpen()) {
            const posts = await SocialPost.find({where: {campaign}, relations: ['user']})
            for(const post of posts) {
                const user = await User.findOne({where : {posts: post}});
                console.log('User who posted to social -->> ', user);
                const socialLink = user ? user.socialLinks.find(link => link.type === post.type) : '';
                console.log('Retrieved Social link -->> ', socialLink);
                if (!socialLink) {
                    logger.error(`participant ${post.user.username} has not linked ${post.type} as a social platform`);
                } else {
                    const {retweet_count, favorite_count} = await TwitterClient.get(socialLink.asClientCredentials(), post.id);
                    post.likes = favorite_count;
                    post.shares = retweet_count;
                    logger.info(`saving new metrics on social post: ${post}`);
                    postsToSave.push(post);
                }
            }
        }
    }
    await getConnection().createEntityManager().save(postsToSave);
    await connection.close();
})()


