import { PlatformTest } from "@tsed/common";
import SuperTest from "supertest";
import { RestServer } from "../../../src/RestServer";

import * as sinon from "sinon";
import { expect } from "chai";
// import { UserService } from "../../../src/services/UserService";
// import { ProfileService } from "../../../src/services/ProfileService";
// import { VerificationService } from "../../../src/services/VerificationService";
import { MISSING_PARAMS, EMAIL_EXISTS, USER_NOT_FOUND } from "../../../src/util/errors";
// import { S3Client } from "../../../src/clients/s3";
// import { SessionService } from "../../../src/services/SessionService";
// import { Profile } from "../../../src/models/Profile";
// import { User } from "../../../src/models/User";

const setEnv = () => {
    process.env.NODE_ENV = "test";
};

const authSandbox = sinon.createSandbox();
describe(" Authentication Controller", () => {
    // const user = new User();
    //  const profile: Profile & {} = new Profile();
    const username: string = "Emmanuel";
    const verificationToken: string = "justSomeRandomToken";
    const password: string = "myPassword";
    const email: string = "me@raiinmaker.com";
    const referralCode = "noReferralCode";

    // let userService: UserService;
    // let profileService: ProfileService;
    // let verificationService: VerificationService;
    // let sessionService: SessionService;
    // let s3Client: S3Client;
    let request: SuperTest.SuperTest<SuperTest.Test>;

    // loading server without listening ports
    before(
        PlatformTest.bootstrap(RestServer, {
            mount: {
                "/v1": [`${__dirname}/controllers/v1/**/*.[jt]s`],
            },
        })
    );
    before(async () => {
        setEnv();
        // request = SuperTest(PlatformTest.callback());

        // userService = PlatformTest.get<UserService>(UserService);
        // profileService = PlatformTest.get<ProfileService>(ProfileService);
        // verificationService = PlatformTest.get<VerificationService>(VerificationService);
        // sessionService = PlatformTest.get<SessionService>(SessionService);
        // s3Client = PlatformTest.get<S3Client>(S3Client);
    });
    after(async () => {
        authSandbox.restore();
        await PlatformTest.reset();
    });
    describe("POST /register-user", () => {
        // missing password, verifcationToken and email
        const missingParams = { username: username };
        const registerUserParam = {
            username: username,
            verificationToken: verificationToken,
            password: password,
            email: email,
        };
        it("should throw MISSING_PARAM on missing params", async () => {
            // const res = await request.post("/register-user").send(missingParams);
            // expect(res).throws(MISSING_PARAMS);
        });
        it("should throw EMAIL_EXISTS", async () => {
            // authSandbox.stub(userService, "findUserByEmail").callsFake(async () => user);
            // expect(await request.post("/register-user").send(registerUserParam)).throws(EMAIL_EXISTS);
        });
        // it("should throw USERNAME_EXISTS", async () => {
        //     authSandbox.stub(userService, "findUserByEmail").resolves(undefined);
        //     authSandbox.stub(profileService, "findProfileByUsername").resolves(profile);
        //     expect(await request.post("/register-user").send(registerUserParam)).toThrowError(USERNAME_EXISTS);
        // });
        it("should throw USER_NOT_FOUND", async () => {
            // authSandbox.stub(userService, "findUserByEmail").withArgs(email).resolves(undefined);
            // authSandbox.stub(profileService, "findProfileByUsername").resolves(undefined);
            // authSandbox.stub(userService, "initNewUser").resolves("userId");
            // authSandbox.stub(verificationService, "verifyToken");
            // authSandbox.stub(userService, "findUserByContext").resolves(undefined);
            // expect(await request.post("/register-user").send(registerUserParam)).throws(USER_NOT_FOUND);
        });
        it("should return success response", async () => {
            // authSandbox.stub(userService, "findUserByEmail").resolves(null);
            // authSandbox.stub(profileService, "findProfileByUsername").resolves(false);
            // authSandbox.stub(userService, "initNewUser").resolves("userId");
            // authSandbox.stub(verificationService, "verifyToken");
            // authSandbox.stub(userService, "findUserByContext").resolves(user);
            // authSandbox.stub(sessionService, "initSession").resolves("token");
            // authSandbox.stub(s3Client, "uploadUserEmails");
            // await request.post("/register-user").send(registerUserParam).expect(200);
        });
        it("should work", () => {});
    });
});
