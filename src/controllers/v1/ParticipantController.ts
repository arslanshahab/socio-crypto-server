import { Get, Property, Required, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { ParticipantModel } from ".prisma/client/entities";
import { ParticipantService } from "../../services/ParticipantService";
import { UserService } from "../../services/UserService";
import { Pagination, SuccessArrayResult, SuccessResult } from "../../util/entities";
import { TwitterClient } from "../../clients/twitter";
import { TikTokClient } from "../../clients/tiktok";
import { FacebookClient } from "../../clients/facebook";
import { PARTICIPANT_NOT_FOUND, SOICIAL_LINKING_ERROR, USER_NOT_FOUND } from "../../util/errors";
import { BadRequest, NotFound } from "@tsed/exceptions";

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
            return FacebookClient;
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
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const participant = await this.participantService.findParticipantById(query, user);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        return new SuccessResult(participant, ParticipantModel);
    }
    @Get("/participant-posts")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(Array))
    public async participantPosts(@QueryParams() query: ListParticipantVariablesModel, @Context() context: Context) {
        const results = [];
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const participant = await this.participantService.findParticipantById(query, user);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        const posts = await this.participantService.findSocialPosts(participant.id);
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            const socialLink = await this.participantService.findSocialLinkByUserId(user?.id || "", "twitter");
            const client = getSocialClient(post.type);
            const response = await client?.getPost(socialLink, post.id);
            results.push(response);
        }
        return new SuccessArrayResult(results, Array);
    }
    @Get("/participant-by-campaign-id")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(ParticipantModel))
    public async participantByCampaignId(
        @QueryParams() query: ListParticipantVariablesModel,
        @Context() context: Context
    ) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const participant = await this.participantService.findParticipantByCampaignId(query, user);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        return new SuccessResult(participant, ParticipantModel);
    }
    @Get("/campaign-participants")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(ParticipantModel))
    public async campaignParticipants(
        @QueryParams() query: ListCampaignParticipantVariablesModel,
        @Context() context: Context
    ) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const [items, count] = await this.participantService.findCampaignParticipants(query, user);
        return new SuccessResult(new Pagination(items, count, ParticipantModel), Pagination);
    }
}
