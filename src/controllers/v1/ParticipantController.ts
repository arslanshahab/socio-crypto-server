import { Get, Property, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { ParticipantModel } from ".prisma/client/entities";
import { ParticipantService } from "../../services/ParticipantService";
import { UserService } from "../../services/UserService";
import { Pagination, SuccessResult } from "../../util/entities";

class ListParticipantVariablesModel {
    @Property() public readonly id: string;
    @Property() public readonly campaignId: string;
    @Property() public readonly userRelated: boolean | undefined;
}

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
// @Controller("/participantPosts")
// export class ParticipantPosts {
//     @Inject()
//     private participantService: ParticipantService;

//     @Inject()
//     private userService: UserService;

//     @Get()
//     @(Returns(200, SuccessResult).Of(Pagination).Nested(ParticipantModel))
//     public async list(@QueryParams() query: ListParticipantVariablesModel, @Context() context: Context) {
//         const user = await this.userService.findUserByContext(context.get("user"));
//         // const participant = await this.participantService.findParticipantById(query, user || undefined);
//         // if (!participant) throw new Error("Participant not found");
//         return "This endpoint is in progress...!";
//     }
// }
@Controller("/participantByCampaignId")
export class ParticipantPosts {
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
