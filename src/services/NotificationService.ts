import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { UpdateNotificationSettingsParams } from "../models/RestModels";

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

    public async updateNotificationSettings(userId: string, data: UpdateNotificationSettingsParams) {
        const { kyc, withdraw, campaignCreate, campaignUpdates } = data;
        return await this.prismaService.notificationSettings.update({
            where: { userId },
            data: {
                kyc: kyc && kyc,
                withdraw: withdraw && withdraw,
                campaignCreate: campaignCreate && campaignCreate,
                campaignUpdates: campaignUpdates && campaignUpdates,
            },
        });
    }
}
