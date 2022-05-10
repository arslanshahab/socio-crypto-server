import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { User, VerificationApplication } from "@prisma/client";
import { KycStatus } from "../types";

@Injectable()
export class VerificationApplicationService {
    @Inject()
    private prismaService: PrismaService;

    public async upsert(data: {
        record?: VerificationApplication;
        appId: string;
        status: KycStatus;
        user: User;
        reason: string;
    }) {
        return await this.prismaService.verificationApplication.upsert({
            where: { id: data.record?.id },
            update: {
                applicationId: data.appId,
                status: data.status,
                userId: data.user.id,
                reason: data.reason,
            },
            create: {
                applicationId: data.appId,
                status: data.status,
                userId: data.user.id,
                reason: data.reason,
            },
        });
    }
}
