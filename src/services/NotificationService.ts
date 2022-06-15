import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";

@Injectable()
export class NotificationService {
    @Inject()
    private prismaService: PrismaService;

    public async findNotificationSettingByUserId(userId: string) {
        return this.prismaService.notificationSettings.findFirst({
            where: { userId },
        });
    }

    public async createNotificationSetting(userId: string) {
        return await this.prismaService.notificationSettings.create({
            data: {
                userId,
            },
        });
    }
}
