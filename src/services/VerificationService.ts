import { Injectable } from "@tsed/di";
import { decrypt, encrypt } from "../util/crypto";
import { Forbidden } from "@tsed/exceptions";
import { EMAIL_NOT_VERIFIED, INCORRECT_CODE_OR_EMAIL, INVALID_VERIFICATION_TOKEN } from "../util/errors";
import { addMinutes, isPast } from "date-fns";
import { VerificationType } from "types";
import { generate6DigitCode } from "../util";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class VerificationService {
    public async findVerificationByEmail(email: string) {
        return readPrisma.verification.findFirst({
            where: { email: email.toLowerCase(), verified: false },
        });
    }

    public async findVerificationById(id: string) {
        return readPrisma.verification.findFirst({
            where: { id, verified: true },
        });
    }

    public isCodeExpired(expiry: Date) {
        return !expiry ? false : isPast(new Date(expiry));
    }

    public generateToken(id: string) {
        return encrypt(id);
    }

    public getDecryptedCode(code: string) {
        return decrypt(code);
    }

    public async expireToken(verificationId: string) {
        return await prisma.verification.update({
            where: { id: verificationId },
            data: { expiry: new Date() },
        });
    }

    public async addExpiryTime(verificationId: string) {
        return await prisma.verification.update({
            where: { id: verificationId },
            data: { expiry: addMinutes(new Date(), 15) },
        });
    }

    public async updateVerificationStatus(status: boolean, verificationId: string) {
        return await prisma.verification.update({
            where: { id: verificationId },
            data: { verified: status },
        });
    }

    public async verifyToken(data: { verificationToken: string; email?: string }) {
        const verificationId = decrypt(data.verificationToken);
        if (!verificationId) throw new Forbidden(EMAIL_NOT_VERIFIED);
        const verification = await this.findVerificationById(verificationId);
        if (!verification) throw new Forbidden(EMAIL_NOT_VERIFIED);
        if (data.email && data.email.toLowerCase() !== verification.email) throw new Forbidden(EMAIL_NOT_VERIFIED);
        if (this.isCodeExpired(verification.expiry!)) throw new Forbidden(INVALID_VERIFICATION_TOKEN);
        await this.expireToken(verification.id);
        return verification;
    }

    public async verifyCode(email: string, code: string) {
        const verification = await this.findVerificationByEmail(email);
        if (!verification || code !== decrypt(verification.code)) throw new Forbidden(INCORRECT_CODE_OR_EMAIL);
        await this.addExpiryTime(verification.id);
        return await this.updateVerificationStatus(true, verification.id);
    }

    public async generateVerification(data: { email: string; type: VerificationType }) {
        let verification = await this.findVerificationByEmail(data.email);
        if (!verification) {
            verification = await prisma.verification.create({
                data: {
                    email: data.email.trim().toLowerCase(),
                    type: data.type,
                    code: encrypt(generate6DigitCode()),
                },
            });
        }
        return verification;
    }
}
