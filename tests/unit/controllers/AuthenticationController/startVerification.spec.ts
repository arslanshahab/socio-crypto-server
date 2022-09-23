import { PlatformTest } from "@tsed/common";
import { handleBaseAssertions, startVerificationRoute } from "../../../test_helper";
import { StartVerificationParams } from "../../../../src/controllers/v1/AuthenticationController";
import { User } from "../../../../src/models/User";
import { UserService } from "../../../../src/services/UserService";
import { VerificationType } from "../../../../src/util/constants";

import { RestServer } from "../../../../src/RestServer";
import * as authControllers from "../../../../src/controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";

import SuperTest from "supertest";
import { EMAIL_EXISTS, EMAIL_NOT_EXISTS } from "../../../../src/util/errors";
import { Verification } from "../../../../src/models/Verification";
import { VerificationService } from "../../../../src/services/VerificationService";
import { SesClient } from "../../../../src/clients/ses";
import { Firebase } from "../../../../src/clients/firebase";

describe("start verification", () => {
    let request: any;
    let userService: UserService;
    let verificationService: VerificationService;

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer, {
            mount: {
                "/v1": [...Object.values(authControllers)],
            },
            acceptMimes: ["application/json"],
            middlewares: [
                {
                    hook: "$beforeRoutesInit",
                    use: bodyParser.json(),
                },
                {
                    hook: "$beforeRoutesInit",
                    use: bodyParser.urlencoded({ extended: true }),
                },
            ],
        })();
    });

    beforeAll(() => {
        request = SuperTest(PlatformTest.callback());
        userService = PlatformTest.get<UserService>(UserService);
        verificationService = PlatformTest.get<VerificationService>(VerificationService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should throw BadRequest on missing params", async () => {
        const body: StartVerificationParams = { email: "me@raiinmaker.com", type: undefined, admin: false };

        const res = await request
            .post(startVerificationRoute)
            .type("/json")
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send(JSON.stringify(body));
        expect(res.statusCode).toEqual(400);
        handleBaseAssertions(res, 400, null);
    });

    it("should throw BadRequest EMAIL_EXIST", async () => {
        const body: StartVerificationParams = {
            email: "me@gmail.com",
            type: VerificationType.EMAIL,
            admin: false,
        };
        const testUser: User = new User();
        const updatedUserEmailSpy = jest.spyOn(userService, "updatedUserEmail").mockResolvedValue(testUser);

        const res = await request
            .post(startVerificationRoute)
            .type("/json")
            .set("content-type", "application/json")
            .send(body);

        handleBaseAssertions(res, 400, EMAIL_EXISTS, updatedUserEmailSpy);
    });

    it("should throw EMAIL_NOT_EXISTS on type PASSWORD", async () => {
        const body: StartVerificationParams = {
            email: "me@gmail.com",
            type: VerificationType.PASSWORD,
            admin: false,
        };

        const updatedUserEmailSpy = jest.spyOn(userService, "updatedUserEmail").mockResolvedValue(null);

        const res = await request
            .post(startVerificationRoute)
            .type("/json")
            .set("content-type", "application/json")
            .send(body);

        handleBaseAssertions(res, 400, EMAIL_NOT_EXISTS, updatedUserEmailSpy);
    });

    it("should throw EMAIL_NOT_EXISTS on type WITHDRAW", async () => {
        const body: StartVerificationParams = {
            email: "me@gmail.com",
            type: VerificationType.WITHDRAW,
            admin: false,
        };

        const updatedUserEmailSpy = jest.spyOn(userService, "updatedUserEmail").mockResolvedValue(null);

        const res = await request
            .post(startVerificationRoute)
            .type("/json")
            .set("content-type", "application/json")
            .send(body);

        handleBaseAssertions(res, 400, EMAIL_NOT_EXISTS, updatedUserEmailSpy);
    });

    // it("should throw EMAIL_EXISTS on admin found", async () => {
    //     const body: StartVerificationParams = {
    //         email: "me@raiinmaker.com",
    //         type: VerificationType.EMAIL,
    //         admin: true,
    //     };
    //     const firebaseSpy = jest.spyOn(Firebase, "getUserByEmail");

    //     const res = await request
    //         .post(startVerificationRoute)
    //         .type("/json")
    //         .set("content-type", "application/json")
    //         .send(JSON.stringify(body));

    //     console.log(res.body);

    //     expect(res.statusCode).toEqual(400);
    //     expect(firebaseSpy).toHaveBeenCalled();
    // });

    it("should successfully start verification for a non-admin", async () => {
        const verification = new Verification();

        const body: StartVerificationParams = {
            email: "me@raiinmaker.com",
            type: VerificationType.EMAIL,
            admin: false,
        };

        const updatedUserEmailSpy = jest.spyOn(userService, "updatedUserEmail").mockResolvedValue(null);

        const generateVerificationSpy = jest
            .spyOn(verificationService, "generateVerification")
            .mockResolvedValue(verification);
        const getDecryptedCodeSyp = jest.spyOn(verificationService, "getDecryptedCode").mockReturnValue("testing");
        const emailAddressVerificationEmailSpy = jest
            .spyOn(SesClient, "emailAddressVerificationEmail")
            .mockImplementation(async (emailAddress, otp) => {
                return true;
            });

        const res = await request
            .post(startVerificationRoute)
            .type("/json")
            .set("content-type", "application/json")
            .send(JSON.stringify(body));

        expect(res.body.success).toEqual(true);
        handleBaseAssertions(
            res,
            200,
            null,
            generateVerificationSpy,
            getDecryptedCodeSyp,
            updatedUserEmailSpy,
            emailAddressVerificationEmailSpy
        );
    });

    it("should successfully start verification for a admin", async () => {
        const verification = new Verification();

        const body: StartVerificationParams = {
            email: "me@raiinmaker.com",
            type: VerificationType.EMAIL,
            admin: true,
        };

        const getUserByEmailSpy = jest.spyOn(Firebase, "getUserByEmail");

        const generateVerificationSpy = jest
            .spyOn(verificationService, "generateVerification")
            .mockResolvedValue(verification);
        const getDecryptedCodeSpy = jest.spyOn(verificationService, "getDecryptedCode").mockReturnValue("testing");
        const emailAddressVerificationEmailSpy = jest
            .spyOn(SesClient, "emailAddressVerificationEmail")
            .mockImplementation(async (emailAddress, otp) => {
                return true;
            });

        const res = await request
            .post(startVerificationRoute)
            .type("/json")
            .set("content-type", "application/json")
            .send(JSON.stringify(body));

        expect(res.body.success).toEqual(true);
        handleBaseAssertions(
            res,
            200,
            null,
            generateVerificationSpy,
            getDecryptedCodeSpy,
            getUserByEmailSpy,
            emailAddressVerificationEmailSpy
        );
    });
});
