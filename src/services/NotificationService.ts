import { Injectable } from "@tsed/di";
import { prisma, readPrisma } from "../clients/prisma";
import { UpdateNotificationSettingsParams } from "../models/RestModels";

@Injectable()
export class NotificationService {
    public async findNotificationSettingByUserId(userId: string) {
        return readPrisma.notificationSettings.findFirst({
            where: { userId },
        });
    }

    public async createNotificationSetting(userId: string) {
        return await prisma.notificationSettings.create({
            data: {
                userId,
            },
        });
    }

    public async updateNotificationSettings(userId: string, data: UpdateNotificationSettingsParams) {
        const { kyc, withdraw, campaignCreate, campaignUpdates } = data;
        return await prisma.notificationSettings.update({
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
