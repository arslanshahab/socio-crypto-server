import { PlatformTest, Req, Res } from "@tsed/common";
import { startVerificationRoute } from "../../../test_helper";
import { StartVerificationParams } from "../../../../src/controllers/v1/AuthenticationController";
// import { User } from "../../../../src/models/User";
// import { UserService } from "../../../../src/services/UserService";
// import { VerificationType } from "../../../../src/util/constants";
import chai from "chai";
import chaiHttp from "chai-http";
import { RestServer } from "../../../../src/RestServer";
import * as authControllers from "../../../../src/controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";
import { NextFunction } from "express";
import SuperTest from "supertest";

chai.use(chaiHttp);

describe("start verification", () => {
    let request: any;

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
                testMiddleware,
            ],
        })();
    });

    beforeAll(() => {
        request = SuperTest(PlatformTest.callback());
    });

    it("should throw BadRequest on missing params", async () => {
        // type set to undefined
        const body: StartVerificationParams = { email: "me@raiinmaker.com", type: undefined, admin: false };

        const res = await request
            .post(startVerificationRoute)
            .type("/json")
            .set("Content-Type", "application/json")
            .set("Accept", "application/json")
            .send(JSON.stringify(body));
        console.log(res.body.message);
    });

    // it("should throw BadRequest EMAIL_EXIST", async () => {
    //     // const body: StartVerificationParams = {
    //     //     email: "me@gmail.com",
    //     //     type: VerificationType.EMAIL,
    //     //     admin: false,
    //     // };
    //     const testUser: User = new User();
    //     const userService = PlatformTest.get<UserService>(UserService);
    //     jest.spyOn(userService, "updatedUserEmail").mockResolvedValue(testUser);

    //     const res = await request.post(startVerificationRoute).type("/json").set("content-type", "application/json");
    //     console.log(res.body.message);
    // });
});

function testMiddleware(res: Res, req: Req, next: NextFunction) {
    console.log("request", req);
    console.log(req.rawHeaders);

    next();
}
