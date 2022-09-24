import { PlatformTest } from "@tsed/common";
import SuperTest from "supertest";
import { RestServer } from "../../../../src/RestServer";

import { handleBaseAssertions, registerUserRoute } from "../../../test_helper";

import * as authControllers from "../../../../src/controllers/v1/AuthenticationController";

import { UserService } from "../../../../src/services/UserService";
import { ProfileService } from "../../../../src/services/ProfileService";
import { VerificationService } from "../../../../src/services/VerificationService";
import { SessionService } from "../../../../src/services/SessionService";
import { User } from "../../../../src/models/User";
import * as bodyParser from "body-parser";
import { EMAIL_EXISTS, USERNAME_EXISTS, USER_NOT_FOUND } from "../../../../src/util/errors";
import { Profile } from "@prisma/client";
import { Verification } from "../../../../src/models/Verification";
import { S3Client } from "../../../../src/clients/s3";
import { RegisterUserParams } from "../../../../src/models/RestModels";

const setEnv = () => {
    process.env.NODE_ENV = "production";
};

describe(" register user", () => {
    let request: any;
    let userService: UserService;
    let profileService: ProfileService;
    let verificationService: VerificationService;
    let sessionService: SessionService;

    const testProfile: Profile & {} = {
        id: "id",
        userId: "userId",
        username: "username",
        recoveryCode: "recoveryCode",
        deviceToken: "deviceToken",
        email: "email",
        profilePicture: "profilePicture",
        ageRange: "ageRange",
        city: "city",
        state: "state",
        country: "country",
        createdAt: new Date(),
        deletedAt: new Date(),
        updatedAt: new Date(),
        platforms: "platform",
        interests: "interest",
        values: "values",
    };

    beforeAll(async () => {
        setEnv();
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

    // beforeAll(() => {
    //     const authMiddleware = PlatformTest.get<UserAuthMiddleware>(UserAuthMiddleware);

    //     jest.spyOn(authMiddleware, "use").mockImplementation(async (req, ctx) => {
    //         console.log("inside spy method");
    //         return;
    //     });
    // });

    beforeAll(() => {
        request = SuperTest(PlatformTest.callback());
        userService = PlatformTest.get<UserService>(UserService);
        profileService = PlatformTest.get<ProfileService>(ProfileService);
        verificationService = PlatformTest.get<VerificationService>(VerificationService);
        sessionService = PlatformTest.get<SessionService>(SessionService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should throw BAD_REQUEST on missing param", async () => {
        // missing password and verificationToken
        const res = await request.post(registerUserRoute).send({ username: "emmanuel", email: "me@raiinmaker.com" });

        console.log(res.body.message);

        expect(res.statusCode).toEqual(400);
    });

    it("should throw Forbidden EMAIL_EXISTS ", async () => {
        const body = {
            email: "me@raiinmaker.com",
            username: "testUsername",
            password: "testPassword",
            verificationToken: "token",
        };
        const findUserByEmailSpy = jest.spyOn(userService, "findUserByEmail").mockResolvedValue(new User());

        const res = await request.post(registerUserRoute).send(body);

        handleBaseAssertions(res, 403, EMAIL_EXISTS, findUserByEmailSpy);
    });

    it("should throw Forbidden USERNAME_EXISTS", async () => {
        const body = {
            email: "me@raiinmaker.com",
            username: "testUsername",
            password: "testPassword",
            verificationToken: "token",
        };
        const findUserByEmailSpy = jest.spyOn(userService, "findUserByEmail").mockResolvedValue(null);
        const findProfileByUsernameSpy = jest
            .spyOn(profileService, "findProfileByUsername")
            .mockResolvedValue(testProfile);

        const res = await request.post(registerUserRoute).send(body);

        handleBaseAssertions(res, 403, USERNAME_EXISTS, findUserByEmailSpy, findProfileByUsernameSpy);
    });

    it("should throw NotFound on 'no user'", async () => {
        const body = {
            email: "me@raiinmaker.com",
            username: "testUsername",
            password: "testPassword",
            verificationToken: "token",
        };
        const findUserByEmailSpy = jest.spyOn(userService, "findUserByEmail").mockResolvedValue(null);
        const findProfileByUsernameSpy = jest.spyOn(profileService, "findProfileByUsername").mockResolvedValue(null);
        const verifyTokenSpy = jest.spyOn(verificationService, "verifyToken").mockResolvedValue(new Verification());
        const initNewUserSpy = jest.spyOn(userService, "initNewUser").mockResolvedValue("useId");
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(null);

        const res = await request.post(registerUserRoute).send(body);

        handleBaseAssertions(
            res,
            404,
            USER_NOT_FOUND,
            findUserByEmailSpy,
            findProfileByUsernameSpy,
            verifyTokenSpy,
            initNewUserSpy,
            findUserByContextSpy
        );
    });

    it("should successfully register a user", async () => {
        const body: RegisterUserParams = {
            email: "me@raiinmaker.com",
            password: "testPassword",
            username: "testUsername",
            verificationToken: "token",
            referralCode: "code",
        };
        const findUserByEmailSpy = jest.spyOn(userService, "findUserByEmail").mockResolvedValue(null);
        const findProfileByUsernameSpy = jest.spyOn(profileService, "findProfileByUsername").mockResolvedValue(null);
        const verifyTokenSpy = jest.spyOn(verificationService, "verifyToken").mockResolvedValue(new Verification());
        const initNewUserSpy = jest.spyOn(userService, "initNewUser").mockResolvedValue("useId");
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(new User());
        const initSessionSpy = jest.spyOn(sessionService, "initSession").mockResolvedValue("token");
        const uploadUserEmailsSpy = jest.spyOn(S3Client, "uploadUserEmails");

        const res = await request.post(registerUserRoute).send(JSON.stringify(body));

        handleBaseAssertions(
            res,
            200,
            undefined,
            findUserByEmailSpy,
            findProfileByUsernameSpy,
            verifyTokenSpy,
            initNewUserSpy,
            findUserByContextSpy,
            initSessionSpy,
            uploadUserEmailsSpy
        );
    });
});
