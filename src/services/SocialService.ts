import { SocialLink } from "@prisma/client";
import { Injectable } from "@tsed/di";
import { TwitterClient } from "../clients/twitter";
import { FacebookClient } from "../clients/facebook";
import { TikTokClient } from "../clients/tiktok";
import { decrypt } from "../util/crypto";
import { prisma } from "../clients/prisma";

@Injectable()
export class SocialService {
    /**
     * Retrieves the latest list of follower counts for all social links provided
     * This will update the counts in the DB if necessary
     *
     * @param socialLinks the social links to retrieve follower counts for, only one type of each link is expected
     * @returns a map of link types to the counts
     */
    public async getLatestFollowersForLinks(socialLinks: SocialLink[]) {
        const followerTotals: { [key: string]: number } = {};
        for (const link of socialLinks) {
            let updateLink = false;
            switch (link.type) {
                case "twitter":
                    followerTotals["twitter"] = await TwitterClient.getTotalFollowersV1(link, link.id);
                    if (link.followerCount !== followerTotals["twitter"]) {
                        link.followerCount = followerTotals["twitter"];
                        updateLink = true;
                    }
                    break;
                case "facebook":
                    const data = await FacebookClient.getPageData(decrypt(link.apiKey!));
                    followerTotals["facebook"] = data["friends"];
                    if (link.followerCount !== followerTotals["facebook"]) {
                        link.followerCount = followerTotals["facebook"];
                        updateLink = true;
                    }
                    break;
                case "tiktok":
                    const tiktokFollower = await TikTokClient.getFolowers();
                    followerTotals["tiktok"] = tiktokFollower;
                    if (link.followerCount !== followerTotals["tiktok"]) {
                        link.followerCount = followerTotals["tiktok"];
                        updateLink = true;
                    }
                    break;
                default:
                    break;
            }
            // if any follower count was changed, save the new count
            if (updateLink) {
                await prisma.socialLink.update({
                    where: { id: link.id },
                    data: { followerCount: link.followerCount },
                });
            }
        }
        return followerTotals;
    }
}
