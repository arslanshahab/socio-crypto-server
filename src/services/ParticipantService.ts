import { User } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { FindParticipantById } from "../types";

@Injectable()
export class ParticipantService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves a paginated list of participants
     *
     * @param params the search parameters for the participants
     * @param user an optional user include in the participants results (depends on params.userRelated)
     * @returns the list of participants, and a count of total participants, matching the parameters
     */
    public async findParticipantById(params: FindParticipantById, user?: User) {
        return this.prismaService.participant.findFirst({
            include: {
                user: true,
                campaign: true,
            },
            where: {
                id: params.id,
            },
        });
    }
}
