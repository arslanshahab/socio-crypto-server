import { PlatformTest } from "@tsed/common";
import { handleBaseAssertions, userLoginRoute } from "../../../test_helper";
import { UserService } from "../../../../services/UserService";

import { RestServer } from "../../../../RestServer";
import * as authControllers from "../../../../controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";

import SuperTest from "supertest";
import { ACCOUNT_RESTRICTED, EMAIL_NOT_EXISTS, INCORRECT_PASSWORD } from "../../../../util/errors";

import { User, Campaign } from "@prisma/client";
import * as util from "../../../../util/index";
import { SessionService } from "../../../../services/SessionService";

import { UserRewardType } from "../../../../util/constants";

describe("user Login", () => {
    let request: any;
    let userService: UserService;
    let sessionService: SessionService;

    const user = (isActive: boolean) => {
        return {
            email: "email@raiinmaker.com",
            password: "password",
            referralCode: "code",
            active: isActive ? true : false,
            createdAt: new Date(),
            updatedAt: new Date(),
            identityId: "identityId",
            id: "id",
            kycStatus: "kycStatus",
            lastLogin: new Date(),
            deletedAt: new Date(),
            promoCode: "code",
        };
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

    beforeAll(() => {
        request = SuperTest(PlatformTest.callback());

        userService = PlatformTest.get<UserService>(UserService);
        sessionService = PlatformTest.get<SessionService>(SessionService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should throw BadRequest on missing params", async () => {
        const body = {
            email: "me@raiinmaker.com",
        };
        const res = await request.post(userLoginRoute).send(body);
        handleBaseAssertions(res, 400, null);
    });

    it("should throw NotFound on 'no user'", async () => {
        const body = {
            email: "me@raiinmaker.com",
            password: "password",
        };
        const findUserByEmailSpy = jest.spyOn(userService, "findUserByEmail").mockResolvedValue(null);

        const res = await request.post(userLoginRoute).send(body);
        handleBaseAssertions(res, 404, EMAIL_NOT_EXISTS, findUserByEmailSpy);
    });

    it("should throw Forbidden on inactive user", async () => {
        const body = {
            email: "me@raiinmaker.com",
            password: "password",
        };
        const findUserByEmailSpy = jest.spyOn(userService, "findUserByEmail").mockResolvedValue(user(false));
        const res = await request.post(userLoginRoute).send(body);
        console.log(res.body);

        handleBaseAssertions(res, 403, ACCOUNT_RESTRICTED, findUserByEmailSpy);
    });

    it("should throw INCORRECT_PASSWORD", async () => {
        const body = {
            email: "me@raiinmaker.com",
            password: "password",
        };
        const findUserByEmailSpy = jest.spyOn(userService, "findUserByEmail").mockResolvedValue(user(true));
        const createPasswordHashSpy = jest
            .spyOn(util, "createPasswordHash")
            .mockImplementation((data: { email: string; password: string }) => "wrong_password");
        const res = await request.post(userLoginRoute).send(body);
        handleBaseAssertions(res, 403, INCORRECT_PASSWORD, findUserByEmailSpy, createPasswordHashSpy);
    });

    it("should login user", async () => {
        const body = {
            email: "me@raiinmaker.com",
            password: "password",
        };
        const findUserByEmailSpy = jest.spyOn(userService, "findUserByEmail").mockResolvedValue(user(true));
        const createPasswordHashSpy = jest
            .spyOn(util, "createPasswordHash")
            .mockImplementation((data: { email: string; password: string }) => "password");
        const transferCoiinRewardSpy = jest
            .spyOn(userService, "transferCoiinReward")
            .mockImplementation(
                async (data: { user: User; type: UserRewardType; campaign?: Campaign | undefined }) => {}
            );
        const sessionServiceSpy = jest.spyOn(sessionService, "initSession").mockResolvedValue("token");
        const res = await request.post(userLoginRoute).send(body);
        console.log(res.body);

        handleBaseAssertions(
            res,
            200,
            null,
            findUserByEmailSpy,
            createPasswordHashSpy,
            transferCoiinRewardSpy,
            sessionServiceSpy
        );
    });
});
