import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../src/RestServer";
import * as authControllers from "../../../../src/controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";
import SuperTest from "supertest";
import { resetPasswordRoute, handleBaseAssertions } from "../../../test_helper";
import { VerificationService } from "../../../../src/services/VerificationService";
import { UserService } from "../../../../src/services/UserService";
import { Verification } from "../../../../src/models/Verification";
import { USER_NOT_FOUND } from "../../../../src/util/errors";
import { User } from "@prisma/client";

describe("reset password", () => {
    let request: any;
    let verificationService: VerificationService;
    let userService: UserService;

    const activeUser: User = {
        email: "email@raiinmaker.com",
        password: "password",
        referralCode: "code",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        identityId: "identityId",
        id: "id",
        kycStatus: "kycStatus",
        lastLogin: new Date(),
        deletedAt: new Date(),
        promoCode: "code",
    };

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

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        verificationService = PlatformTest.get<VerificationService>(VerificationService);
        userService = PlatformTest.get<UserService>(UserService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should throw BadRequest on missing params", async () => {
        //missing password
        const body = {
            verificationToken: "token",
        };

        const res = await request.post(resetPasswordRoute).send(body);
        handleBaseAssertions(res, 400, null);
    });

    it("should throw user not found on 'no user'", async () => {
        const body = {
            verificationToken: "token",
            password: "password",
        };
        const verifyTokenSpy = jest.spyOn(verificationService, "verifyToken").mockResolvedValue(new Verification());
        const findUserByEmailSpy = jest.spyOn(userService, "findUserByEmail").mockResolvedValue(null);

        const res = await request.post(resetPasswordRoute).send(body);

        handleBaseAssertions(res, 404, USER_NOT_FOUND, verifyTokenSpy, findUserByEmailSpy);
    });

    it("should successfully reset password", async () => {
        const body = {
            verificationToken: "token",
            password: "password",
        };
        const verifyTokenSpy = jest.spyOn(verificationService, "verifyToken").mockResolvedValue(new Verification());
        const findUserByEmailSpy = jest.spyOn(userService, "findUserByEmail").mockResolvedValue(activeUser);
        const resetUserPasswordSpy = jest
            .spyOn(userService, "resetUserPassword")
            .mockImplementation(async (userId: string, email: string, password: string) => activeUser);
        const res = await request.post(resetPasswordRoute).send(body);

        handleBaseAssertions(res, 200, null, verifyTokenSpy, findUserByEmailSpy, resetUserPasswordSpy);
    });
});
