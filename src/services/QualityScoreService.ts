import { Injectable } from "@tsed/di";
import { prisma } from "../clients/prisma";

@Injectable()
export class QualityScoreService {
    public async findByParticipantOrCreate(participantId: string) {
        let record = await prisma.qualityScore.findFirst({
            where: { participantId: participantId },
            orderBy: { createdAt: "desc" },
        });
        if (!record) {
            record = await prisma.qualityScore.create({
                data: {
                    participantId,
                    clicks: "0",
                    views: "0",
                    submissions: "0",
                    likes: "0",
                    shares: "0",
                    comments: "0",
                },
            });
        }
        return record;
    }
}
