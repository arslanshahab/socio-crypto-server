import { Get, Property, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { ParticipantModel } from ".prisma/client/entities";
import { ParticipantService } from "../../services/ParticipantService";
import { UserService } from "../../services/UserService";
import { Pagination, SuccessArrayResult, SuccessResult } from "../../util/entities";
import { PARTICIPANT_NOT_FOUND, USER_NOT_FOUND } from "../../util/errors";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { getSocialClient } from "../helpers";

class ListParticipantVariablesModel {
    @Property() public readonly id: string;
    @Property() public readonly campaignId: string;
    @Property() public readonly skip: number;
    @Property() public readonly take: number;
    @Property() public readonly userRelated: boolean | undefined;
}

@Controller("/participant")
export class ParticipantController {
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(ParticipantModel))
    public async getParticipant(@QueryParams() query: ListParticipantVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const participant = await this.participantService.findParticipantById(query, user);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        return new SuccessResult(participant, ParticipantModel);
    }
    @Get("/participant-posts")
    @(Returns(200, SuccessArrayResult).Of(String))
    public async getParticipantPosts(@QueryParams() query: ListParticipantVariablesModel, @Context() context: Context) {
        const results: string[] = [];
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
            if (response) results.push(response);
        }
        return new SuccessArrayResult(results, String);
    }
    @Get("/participant-by-campaign-id")
    @(Returns(200, SuccessResult).Of(ParticipantModel))
    public async getParticipantByCampaignId(
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
    public async getCampaignParticipants(
        @QueryParams() query: ListParticipantVariablesModel,
        @Context() context: Context
    ) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const [items, count] = await this.participantService.findCampaignParticipants(query);
        return new SuccessResult(new Pagination(items, count, ParticipantModel), Pagination);
    }
}
