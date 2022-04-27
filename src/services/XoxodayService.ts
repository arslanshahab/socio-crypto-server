import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { initDateFromParams } from "../util/date";

@Injectable()
export class XoxodayService {
    @Inject()
    private prismaService: PrismaService;

    public async getLast24HourRedemption(type: string) {
        const date = initDateFromParams({ date: new Date(), d: new Date().getDate() - 0, h: 0, i: 0, s: 0 });
        return this.prismaService.transfer.findFirst({
            where: {
                action: type,
                createdAt: {
                    gt: date,
                },
            },
        });
    }
}
