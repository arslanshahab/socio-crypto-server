import { PlatformTest } from "@tsed/common";
import { handleBaseAssertions, usernameExistsRoute } from "../../../test_helper";

import { RestServer } from "../../../../src/RestServer";
import * as authControllers from "../../../../src/controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";

import SuperTest from "supertest";
import { ProfileService } from "../../../../src/services/ProfileService";
import { Profile } from "@prisma/client";

describe("Username exists", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let profileService: ProfileService;

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

        profileService = PlatformTest.get<ProfileService>(ProfileService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should return profile if user exists", async () => {
        const isUsernameExistsSpy = jest.spyOn(profileService, "isUsernameExists").mockResolvedValue(testProfile);
        const res = await request.get(usernameExistsRoute).query({ username: "emmanuel" });
        console.log(res.body);

        handleBaseAssertions(res, 200, null, isUsernameExistsSpy);
    });
});
