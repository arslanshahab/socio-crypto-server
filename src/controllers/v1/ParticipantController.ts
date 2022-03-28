import { Get, Property, Required, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { ParticipantModel } from ".prisma/client/entities";
import { ParticipantService } from "../../services/ParticipantService";
import { UserService } from "../../services/UserService";
import { Pagination, SuccessResult } from "../../util/entities";
import { TwitterClient } from "../../clients/twitter";
import { TikTokClient } from "../../clients/tiktok";
import { FacebookClient } from "../../clients/facebook";
import { NO_TOKEN_PROVIDED, SOICIAL_LINKING_ERROR } from "../../util/errors";

class ListParticipantVariablesModel {
    @Property() public readonly id: string;
    @Property() public readonly campaignId: string;
    @Property() public readonly userRelated: boolean | undefined;
}
class ListCampaignParticipantVariablesModel {
    @Required() public readonly skip: number;
    @Required() public readonly take: number;
    @Property() public campaignId: string;
    @Property() public readonly userRelated: boolean | undefined;
}
export const getSocialClient = (type: string, accessToken?: string): any => {
    switch (type) {
        case "twitter":
            return TwitterClient;
        case "tiktok":
            return TikTokClient;
        case "facebook":
            if (!accessToken) throw new Error(NO_TOKEN_PROVIDED);
            return FacebookClient.getClient(accessToken);
        default:
            throw new Error(SOICIAL_LINKING_ERROR);
    }
};
@Controller("/participant")
export class ParticipantController {
    @Inject()
    private participantService: ParticipantService;

    @Inject()
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(ParticipantModel))
    public async list(@QueryParams() query: ListParticipantVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        const participant = await this.participantService.findParticipantById(query, user || undefined);
        if (!participant) throw new Error("Participant not found");
        return new SuccessResult(participant);
    }
}
@Controller("/participantPosts")
export class ParticipantPosts {
    @Inject()
    private participantService: ParticipantService;

    @Inject()
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(ParticipantModel))
    public async list(@QueryParams() query: ListParticipantVariablesModel, @Context() context: Context) {
        // const results: Promise<any>[] = [];
        const user = await this.userService.findUserByContext(context.get("user"));
        const participant = await this.participantService.findParticipantById(query, user || undefined);
        if (!participant) throw new Error("Participant not found");
        const posts = await this.participantService.findSocialPosts(participant.id);
        const socialLink = await this.participantService.findSocialLinkByUserId(user?.id || "", "twitter");
        const client = getSocialClient("twitter");
        console.log(posts, socialLink, client);

        // for (let i = 0; i < posts.length; i++) {
        //     const post = posts[i];
        //     let a = await client.get(socialLink, post.id);
        //     console.log("client......................................../4*", a);
        //     results.push(a);
        // }

        return "This endpoint is in progress...!";
    }
}
@Controller("/participantByCampaignId")
export class ParticipantByCampaignId {
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(ParticipantModel))
    public async list(@QueryParams() query: ListParticipantVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        const participant = await this.participantService.findParticipantByCampaignId(query, user || undefined);
        if (!participant) throw new Error("Participant not found");
        return new SuccessResult(participant);
    }
}
@Controller("/campaignParticipants")
export class CampaignParticipants {
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(ParticipantModel))
    public async list(@QueryParams() query: ListCampaignParticipantVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        const [items, count] = await this.participantService.findCampaignParticipants(query, user || undefined);
        return new SuccessResult(new Pagination(items, count));
    }
}
