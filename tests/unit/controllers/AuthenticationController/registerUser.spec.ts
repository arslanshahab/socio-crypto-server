import { PlatformTest } from "@tsed/common";
import SuperTest from "supertest";
import { RestServer } from "../../../../src/RestServer";

import { registerUserRoute } from "../../../test_helper";
import { expect } from "chai";
import * as authControllers from "../../../../src/controllers/v1/AuthenticationController";
import { UserAuthMiddleware } from "../../../../src/middleware/UserAuthMiddleware";

describe(" Authentication Controller", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;

    beforeAll(async () => {
        console.log("test server started ...");
        await PlatformTest.bootstrap(RestServer, {
            mount: {
                "/v1": [...Object.values(authControllers)],
            },
            acceptMimes: ["application/json"],
        })();
    });

    beforeAll(() => {
        request = SuperTest(PlatformTest.callback());
    });
    beforeAll(() => {
        const authMiddleware = PlatformTest.get<UserAuthMiddleware>(UserAuthMiddleware);
        console.log(authMiddleware);
        console.log("before was called after authMiddleware");

        jest.spyOn(authMiddleware, "use").mockImplementation(async (req, ctx) => {
            console.log("inside spy method");
            return;
        });
    });
    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should throw BAD_REQUEST on missing param", async () => {
        const res = await request
            .post(registerUserRoute)
            .set("Authorization", "Basic token")
            .send({ username: "emmanuel", email: "me@raiinmaker.com" });
        expect(res.statusCode).equals(400);
    });
});
