// import { PlatformTest } from "@tsed/common";
// import SuperTest from "supertest";
// import { RestServer } from "../../../../src/RestServer";

// import { registerUserRoute } from "../../../test_helper";
// import { expect } from "chai";
// import * as authControllers from "../../../../src/controllers/v1/AuthenticationController";
// import { UserAuthMiddleware } from "../../../../src/middleware/UserAuthMiddleware";
// // const setEnv = () => {
// //     process.env.NODE_ENV = "test";
// // };

// // const authSandbox = sinon.createSandbox();
// describe(" Authentication Controller", () => {
//     // const user = new User();
//     // const authSandbox = createSandbox();
//     //  const profile: Profile & {} = new Profile();
//     // const username: string = "Emmanuel";
//     // const verificationToken: string = "justSomeRandomToken";
//     // const password: string = "myPassword";
//     // const email: string = "me@raiinmaker.com";
//     // const referralCode = "noReferralCode";

//     // let userService: UserService;
//     // let profileService: ProfileService;
//     // let verificationService: VerificationService;
//     // let sessionService: SessionService;
//     // let s3Client: S3Client;
//     let request: SuperTest.SuperTest<SuperTest.Test>;

//     // let authMiddlewareSpy: jest.SpyInstance;

//     // before(PlatformTest.bootstrap(RestServer, {}));
//     beforeAll(async () => {
//         console.log("test server started ...");
//         await PlatformTest.bootstrap(RestServer, {
//             mount: {
//                 "/v1": [...Object.values(authControllers)],
//             },
//             acceptMimes: ["application/json"],
//         })();
//     });

//     beforeAll(() => {
//         request = SuperTest(PlatformTest.callback());
//     });
//     beforeAll(() => {
//         const authMiddleware = PlatformTest.get<UserAuthMiddleware>(UserAuthMiddleware);
//         console.log(authMiddleware);
//         console.log("before was called after authMiddleware");

//         jest.spyOn(authMiddleware, "use").mockImplementation(async (req, ctx) => {
//             console.log("inside spy method");
//             return;
//         });
//     });
//     afterAll(async () => {
//         await PlatformTest.reset();
//     });

//     it("should pass", async () => {
//         const res = await request
//             .post(registerUserRoute)
//             .set("Authorization", "Basic token")
//             .send({ username: "emmanuel" });
//         expect(res.statusCode).equals(400);
//     });
// });
