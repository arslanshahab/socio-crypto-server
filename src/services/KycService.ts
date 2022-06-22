import { User, VerificationApplication } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { S3Client } from "../clients/s3";
import { generateFactorsFromKYC, getApplicationStatus, getKycStatusDetails } from "../util";
import { AcuantClient } from "../clients/acuant";

@Injectable()
export class KycService {
    @Inject()
    private prismaService: PrismaService;

    /**
     * Retrieves a kyc application for the given user
     *
     * @param user the user to retrieve the kyc application for
     * @returns the kyc application for the given user, if one exists
     */
    public async getApplication(
        user: User & {
            verification_application: VerificationApplication | null;
        }
    ) {
        const recordedApplication = user.verification_application;
        if (!recordedApplication) return null;

        let kycApplication;
        if (recordedApplication.status === "APPROVED") {
            kycApplication = await S3Client.getAcuantKyc(user.id);
            return {
                kyc: recordedApplication,
                factors: generateFactorsFromKYC(kycApplication),
            };
        }
        if (recordedApplication.status === "PENDING") {
            kycApplication = await AcuantClient.getApplication(recordedApplication.applicationId);
            const status = getApplicationStatus(kycApplication);
            const reason = getKycStatusDetails(kycApplication);
            let factors;
            if (status === "APPROVED") {
                await S3Client.uploadAcuantKyc(user.id, kycApplication);
                factors = generateFactorsFromKYC(kycApplication);
            }
            // update status and reason
            this.prismaService.verificationApplication.update({
                data: { status, reason },
                where: { id: recordedApplication.id },
            });
            return { kyc: recordedApplication, factors };
        }
        return { kyc: recordedApplication };
    }

    /**
     * Retrieves the raw kyc application stored in S3 for the given user
     *
     * @param userId the user to retrieve the kyc application for
     * @returns the kyc application for the given user, if one exists
     */
    public async getRawApplication(userId: string) {
        const response = await S3Client.getUserObject(userId);
        if (response) {
            if (response.hasAddressProof) response.addressProof = await S3Client.getKycImage(userId, "addressProof");
            if (response.hasIdProof) response.idProof = await S3Client.getKycImage(userId, "idProof");
        }
        return response;
    }

    /**
     * Clears the kyc application for the given user from S3 and the DB
     *
     * @param userId the user to clear the kyc application for
     * @param verificationApplicationId the id of the verification application to clear
     * @returns the cleared verification application
     */
    public async clearApplication(userId: string, verificationApplicationId: string) {
        const kyc = await S3Client.getAcuantKyc(userId);
        if (kyc) await S3Client.deleteAcuantKyc(userId);
        this.prismaService.verificationApplication.delete({ where: { id: verificationApplicationId } });
        return generateFactorsFromKYC(kyc);
    }

    public async updateKycStatus(userId: string, kycStatus: string) {
        return await this.prismaService.user.update({
            where: { id: userId },
            data: { kycStatus: kycStatus.toUpperCase() },
        });
    }
}
