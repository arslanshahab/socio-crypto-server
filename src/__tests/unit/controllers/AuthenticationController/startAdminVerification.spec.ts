import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { handleBaseAssertions, startAdminVerificationRoute } from "../../../test_helper";
import { VerificationType } from "../../../../util/constants";
import { VerificationService } from "../../../../services/VerificationService";
import { Verification } from "../../../../models/Verification";
import { SesClient } from "../../../../clients/ses";

describe("start admin verification", () => {
    let verificationService: VerificationService;
    let request: SuperTest.SuperTest<SuperTest.Test>;

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        verificationService = PlatformTest.get(VerificationService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should throw BAD_REQUEST on missing params", async () => {
        // missing type
        const body = { email: "me@raiinmaker.com" };

        const res = await request.post(startAdminVerificationRoute).send(body);

        handleBaseAssertions(res, 400, null);
    });

    it("should verify admin", async () => {
        const body = { email: "me@raiinmaker.com", type: VerificationType.EMAIL };
        const generateVerificationSpy = jest
            .spyOn(verificationService, "generateVerification")
            .mockResolvedValue(new Verification());
        const getDecryptedCode = jest
            .spyOn(verificationService, "getDecryptedCode")
            .mockImplementation((code: string) => "code");
        const emailAddressVerificationEmailSpy = jest
            .spyOn(SesClient, "emailAddressVerificationEmail")
            .mockImplementation(async (emailAddress: string, otp: string) => true);

        const res = await request.post(startAdminVerificationRoute).send(body);

        handleBaseAssertions(
            res,
            200,
            null,
            generateVerificationSpy,
            getDecryptedCode,
            emailAddressVerificationEmailSpy
        );
    });
});
