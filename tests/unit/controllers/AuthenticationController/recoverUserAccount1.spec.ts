import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../src/RestServer";
import * as authControllers from "../../../../src/controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";
import SuperTest from "supertest";
import { handleBaseAssertions, recoverUserAccountStep1Route } from "../../../test_helper";

import { USERNAME_NOT_EXISTS, INCORRECT_CODE, USER_NOT_FOUND } from "../../../../src/util/errors";
import { User, Profile } from "@prisma/client";
import { ProfileService } from "../../../../src/services/ProfileService";
import * as v2 from "../../../../src/util/index";

describe("recover use account step1", () => {
    let request: any;

    let profileService: ProfileService;
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

    const profile = (hasUser: boolean): Profile & { user: User | null } => {
        return {
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
            user: hasUser ? activeUser : null,
        };
    };

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer, {
            mount: {
                "/v1": [...Object.values(authControllers)],
            },
            cache: undefined,
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

        profileService = PlatformTest.get<ProfileService>(ProfileService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should throw BadRequest on missing params", async () => {
        //missing code
        const body = {
            username: "username",
        };

        const res = await request.post(recoverUserAccountStep1Route).send(body);
        handleBaseAssertions(res, 400, null);
    });

    it("should throw USERNAME_NOT_EXIST code", async () => {
        const body = {
            username: "username",
            code: "code",
        };
        const findProfileByUsernameSpy = jest.spyOn(profileService, "findProfileByUsername").mockResolvedValue(null);
        const res = await request.post(recoverUserAccountStep1Route).send(body);

        handleBaseAssertions(res, 404, USERNAME_NOT_EXISTS, findProfileByUsernameSpy);
    });

    it("should throw INCORRECT_CODE", async () => {
        const body = {
            username: "username",
            code: "code",
        };
        const findProfileByUsernameSpy = jest
            .spyOn(profileService, "findProfileByUsername")
            .mockResolvedValue(profile(true));
        const isRecoveryCodeValidSpy = jest.spyOn(profileService, "isRecoveryCodeValid").mockResolvedValue(false);
        const res = await request.post(recoverUserAccountStep1Route).send(body);

        handleBaseAssertions(res, 403, INCORRECT_CODE, findProfileByUsernameSpy, isRecoveryCodeValidSpy);
    });

    it("should throw USER_NOT_FOUND", async () => {
        const body = {
            username: "username",
            code: "code",
        };
        const findProfileByUsernameSpy = jest
            .spyOn(profileService, "findProfileByUsername")
            .mockResolvedValue(profile(false));
        const isRecoveryCodeValidSpy = jest.spyOn(profileService, "isRecoveryCodeValid").mockResolvedValue(true);
        const res = await request.post(recoverUserAccountStep1Route).send(body);

        handleBaseAssertions(res, 404, USER_NOT_FOUND, findProfileByUsernameSpy, isRecoveryCodeValidSpy);
    });

    it("should successfully recover account sending token", async () => {
        const body = {
            username: "username",
            code: "code",
        };
        const findProfileByUsernameSpy = jest
            .spyOn(profileService, "findProfileByUsername")
            .mockResolvedValue(profile(true));
        const isRecoveryCodeValidSpy = jest.spyOn(profileService, "isRecoveryCodeValid").mockResolvedValue(true);
        const createSessionTokenV2Spy = jest
            .spyOn(v2, "createSessionTokenV2")
            .mockImplementation((user: User) => "token");
        const res = await request.post(recoverUserAccountStep1Route).send(body);

        expect(res.body.data.token).toContain("token");
        handleBaseAssertions(res, 200, null, findProfileByUsernameSpy, isRecoveryCodeValidSpy, createSessionTokenV2Spy);
    });
});
