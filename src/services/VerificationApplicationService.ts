import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { Profile, User, VerificationApplication } from "@prisma/client";
import { KycApplication, KycStatus } from "../types";
import { S3Client } from "../clients/s3";
import { generateFactorsFromKYC, getApplicationStatus, getKycStatusDetails } from "../util/index";
import { AcuantClient } from "../clients/acuant";
import { KycLevel, KycStatus as KycStatusEnum } from "../util/constants";
import { Firebase } from "../clients/firebase";
import { Validator } from "../schemas";

const validator = new Validator();

@Injectable()
export class VerificationApplicationService {
    @Inject()
    private prismaService: PrismaService;

    public async findByUserIdAndLevel(userId: string, level: KycLevel) {
        return await this.prismaService.verificationApplication.findFirst({ where: { userId, level } });
    }

    public async getProfileData(userId: string, level: KycLevel): Promise<KycApplication> {
        const app = await this.prismaService.verificationApplication.findFirst({ where: { userId, level } });
        return app?.profile ? JSON.parse(app.profile) : {};
    }

    public async upsert(data: {
        level: KycLevel;
        record?: VerificationApplication;
        appId: string;
        status: KycStatus;
        userId: string;
        reason: string;
        profile?: string;
    }) {
        return await this.prismaService.verificationApplication.upsert({
            where: { id: data.record?.id || data.userId },
            update: {
                applicationId: data.appId,
                status: data.status,
                userId: data.userId,
                reason: data.reason,
            },
            create: {
                applicationId: data.appId,
                status: data.status,
                userId: data.userId,
                reason: data.reason,
                level: data.level,
                profile: data.profile,
            },
        });
    }

    public async findKycApplication(userId: string, level: KycLevel) {
        const recordedApplication = await this.prismaService.verificationApplication.findFirst({
            where: { userId: userId, level },
        });
        if (!recordedApplication) return null;
        let kycApplication;
        if (recordedApplication.status === KycStatusEnum.APPROVED) {
            try {
                kycApplication = await S3Client.getAcuantKyc(userId);
            } catch (error) {}
            return {
                kyc: recordedApplication,
                factors: kycApplication ? generateFactorsFromKYC(kycApplication) : null,
            };
        }
        if (recordedApplication.status === KycStatusEnum.PENDING) {
            kycApplication = await AcuantClient.getApplication(recordedApplication.applicationId);
            const status = getApplicationStatus(kycApplication);
            const reason = getKycStatusDetails(kycApplication);
            let factors;
            if (status === KycStatusEnum.APPROVED) {
                await S3Client.uploadAcuantKyc(userId, kycApplication);
                factors = generateFactorsFromKYC(kycApplication);
            }
            await this.updateStatus(status, recordedApplication);
            await this.updateReason(reason, recordedApplication.id);
            return { kyc: recordedApplication, factors };
        }
        return { kyc: recordedApplication };
    }

    public async updateStatus(newStatus: string, data: VerificationApplication) {
        let updatedApplication;
        if (data.status !== newStatus && data.status !== "APPROVED") {
            updatedApplication = await this.prismaService.verificationApplication.update({
                where: {
                    id: data.id,
                },
                data: {
                    status: newStatus,
                },
            });
        }
        return updatedApplication;
    }

    public async updateReason(newReason: string, id: string) {
        return await this.prismaService.verificationApplication.update({
            where: { id },
            data: {
                reason: newReason,
            },
        });
    }

    public async isLevel1Approved(userId: string) {
        return (
            (await this.prismaService.verificationApplication.findFirst({ where: { userId, level: KycLevel.LEVEL1 } }))
                ?.status === KycStatusEnum.APPROVED
        );
    }

    public async isLevel2Approved(userId: string) {
        return (
            (await this.prismaService.verificationApplication.findFirst({ where: { userId, level: KycLevel.LEVEL2 } }))
                ?.status === KycStatusEnum.APPROVED
        );
    }

    public async registerKyc(data: {
        user: User & { profile?: Profile | null };
        level: KycLevel;
        query: KycApplication;
    }) {
        const { user, level, query } = data;
        const currentKycApplication = await this.findKycApplication(user?.id, level);
        let verificationApplication;
        let factors;
        if (!currentKycApplication || currentKycApplication.kyc.status === KycStatusEnum.REJECTED) {
            if (level === KycLevel.LEVEL1) {
                validator.validateKycLevel1(query);
            } else {
                validator.validateKycLevel2(query);
            }
            const newAcuantApplication = await AcuantClient.submitApplicationV2(query, level);
            const status = getApplicationStatus(newAcuantApplication);
            verificationApplication = await this.upsert({
                level,
                appId: newAcuantApplication.mtid,
                status,
                userId: user.id,
                reason: getKycStatusDetails(newAcuantApplication),
                record: currentKycApplication?.kyc,
            });
            Firebase.sendKycVerificationUpdate(user?.profile?.deviceToken || "", status);
        } else {
            verificationApplication = currentKycApplication.kyc;
            factors = currentKycApplication.factors;
        }
        return {
            kycId: verificationApplication?.applicationId,
            status: verificationApplication?.status,
            factors,
        };
    }
}
