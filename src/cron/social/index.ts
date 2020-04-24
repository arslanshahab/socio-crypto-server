import {Campaign} from "../../models/Campaign";
import {TwitterClient} from "../../clients/twitter";
import {SocialPost} from "../../models/SocialPost";
import {getConnection} from "typeorm";

(async () => {
    let postsToSave: SocialPost[] = [];
    const campaigns = await Campaign.find({relations: ['posts']});
    campaigns.forEach(campaign => {
        if (campaign.isOpen()){
            campaign.posts.forEach( async post => {
                const socialLink = post.user.socialLinks.find(link => link.type === post.type);
                if (!socialLink) {
                    console.log(`participant ${post.user.username} has not linked ${post.type} as a social platform`);
                } else {
                    const {retweet_count, favorite_count} = await TwitterClient.get(socialLink.asClientCredentials(), post.id);
                    post.likes = favorite_count;
                    post.shares = retweet_count;
                    console.log(`saving new metrics on social post: ${post}`);
                    postsToSave.push(post);
                }
            })
        }
    })
    await getConnection().createEntityManager().save(postsToSave);
})()

