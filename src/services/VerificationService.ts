import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { decrypt, encrypt } from "../util/crypto";
import { BadRequest } from "@tsed/exceptions";
import { EMAIL_NOT_VERIFIED, VERIFICATION_TOKEN_EXPIRED } from "../util/errors";
import { isPast } from "date-fns";
import { VerificationType } from "../types";
import { generateRandomNonce } from "../util";

@Injectable()
export class VerificationService {
    @Inject()
    private prismaService: PrismaService;

    public async findVerificationByToken(verificationToken: string) {
        return this.prismaService.verification.findFirst({ where: { id: decrypt(verificationToken), verified: true } });
    }

    public isCodeExpired(expiry: Date) {
        return !expiry ? false : isPast(new Date(expiry));
    }

    public async expireToken(verificationId: string) {
        return await this.prismaService.verification.update({
            where: { id: verificationId },
            data: { expiry: new Date() },
        });
    }

    public async verifyToken(data: { verificationToken: string; email?: string }) {
        const verification = await this.findVerificationByToken(data.verificationToken);
        if (!verification) throw new BadRequest(EMAIL_NOT_VERIFIED);
        if (data.email && data.email.toLowerCase() !== verification.email) throw new Error(EMAIL_NOT_VERIFIED);
        if (this.isCodeExpired(verification.expiry!)) throw new Error(VERIFICATION_TOKEN_EXPIRED);
        await this.expireToken(verification.id);
        return verification;
    }

    public async generateVerification(data: { email: string; type: VerificationType }) {
        let verification = await this.prismaService.verification.findFirst({
            where: { email: data.email, verified: false },
        });
        if (!verification) {
            verification = await this.prismaService.verification.create({
                data: {
                    email: data.email,
                    type: data.type,
                    code: encrypt(generateRandomNonce()),
                },
            });
        }
        return verification;
    }

    public getDecryptedCode(code: string) {
        return decrypt(code);
    }
}
