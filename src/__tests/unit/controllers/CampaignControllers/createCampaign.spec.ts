import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import { AuthenticationController } from "../../../../controllers/v1/AuthenticationController";
// import { ListCampaignsVariablesModel } from "../../../../controllers/v1/CampaignController";
import * as bodyParser from "body-parser";
import SuperTest from "supertest";

import { handleBaseAssertions, createCampaignRoute } from "../../../test_helper";

import { AdminService } from "../../../../services/AdminService";
// import { UserService } from "../../../../services/UserService";
// import {
//     Campaign,
//     CampaignMedia,
//     CampaignTemplate,
//     CryptoCurrency,
//     Currency,
//     Participant,
//     Token,
//     User,
// } from "@prisma/client";
// import { CampaignService } from "../../../../services/CampaignService";
// import { MarketDataService } from "../../../../services/MarketDataService";

// import { UserAuthMiddleware } from "../../../../middleware/UserAuthMiddleware";
import { SessionService } from "../../../../services/SessionService";
import { CreateCampaignParams } from "../../../../models/RestModels";
import { ADMIN_NOT_FOUND } from "../../../../util/errors";
import { VerificationApplicationService } from "../../../../services/VerificationApplicationService";
// import { VerificationApplication } from "../../../../models/VerificationApplication";
import { RAIINMAKER_ORG_NAME } from "../../../../util/constants";
// import { User } from "../../../../models/User";

// import { Org } from "../../../../models/Org";

// import { SaveOptions } from "typeorm";
// import { Profile } from "../../../../models/Profile";
// import { Wallet } from "../../../../models/Wallet";
// import { NotificationSettings } from "../../../../models/NotificationSettings";
// import { Admin } from "../../../../models/Admin";
// import { Campaign } from "@prisma/client";
// import { CampaignState, CampaignAuditStatus } from "../../../../util/constants";

describe("Admin login", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let adminService: AdminService;
    // let campaignService: CampaignService;
    // let marketDataService: MarketDataService;
    // let userService: UserService;
    // let userAuthMiddleware: UserAuthMiddleware;
    let sessionService: SessionService;
    // let verificationApplicationService: VerificationApplicationService;

    // const user = (): User => {
    //     return {
    //         email: "email@raiinmaker.com",
    //         password: "password",
    //         referralCode: "code",
    //         active: true,
    //         createdAt: new Date(),
    //         updatedAt: new Date(),
    //         identityId: "identityId",
    //         id: "id",
    //         kycStatus: KycStatus.APPROVED,
    //         lastLogin: new Date(),
    //         deletedAt: new Date(),
    //         promoCode: "code",
    //         posts: [],
    //         kycStatusDetails: "details",
    //         campaigns: [],
    //         wallet: wallet(),
    //         addresses: [],
    //         socialLinks: [],
    //         identityVerification: [],
    //         factorLinks: [],
    //         twentyFourHourMetrics: [],
    //         profile: profile(),
    //         notificationSettings: notificationSettings(),
    //         dailyMetrics: [],
    //         admins: [],
    //         orders: [],
    //         nfts: [],
    //         nameToUpperCase: () => {},
    //         asV1: () => {},
    //         asV2: async () => {},
    //         hasKycApproved: async () => true,
    //         updateCoiinBalance: async (operation) => {},
    //         transferCoiinReward: async (data) => {},
    //         updateLastLogin: async () => testUser,
    //         updateEmailPassword: async (email, password) => testUser,
    //         updateEmail: async (email) => testUser,
    //         hasId: () => true,
    //         save: async (options) => testUser,
    //         remove: async (options) => testUser,
    //         softRemove: async (options) => testUser,
    //         recover: async (options) => testUser,
    //         reload: async () => {},
    //     };
    // };

    // const wallet = (): Wallet => {
    //     return {
    //         id: "id",
    //         walletCurrency: [],
    //         org: testOrg(),
    //         user: user(),
    //         addresses: [],
    //         currency: [],
    //         custodialAddress: [],
    //         escrows: [],
    //         transfers: [],
    //         createdAt: new Date(),
    //         updatedAt: new Date(),
    //         asV1: (pendingBalance: string) => testWallet,
    //         hasId: () => true,
    //         save: async (options: SaveOptions) => testWallet,
    //         remove: async (options: SaveOptions) => testWallet,
    //         softRemove: async (options: SaveOptions) => testWallet,
    //         recover: async (options: SaveOptions) => testWallet,
    //         reload: async () => {},
    //     };
    // };

    // const org = (): Org => {
    //     return {
    //         id: "id",
    //         name: "name",
    //         stripeId: "id",
    //         logo: "logo",
    //         campaigns: [],
    //         transfers: [],
    //         admins: [],
    //         createdAt: new Date(),
    //         updatedAt: new Date(),
    //         hourlyMetrics: [],
    //         asV1: () => org(),
    //         updateBalance: async (currency, operation, amount) => {},
    //         getAvailableBalance: async (token) => 3,
    //         hasId: () => true,
    //         save: async (options) => testOrg(),
    //         remove: async (options) => testOrg(),
    //         softRemove: async (options) => testOrg(),
    //         recover: async (options) => testOrg(),
    //         reload: async () => {},
    //         wallet: wallet(),
    //     };
    // };

    // // const modelMethods = <T>(model: T) => {
    // //     return {
    // //         hasId: () => true,
    // //         save: async (options: SaveOptions) => model,
    // //         remove: async (options: SaveOptions) => model,
    // //         softRemove: async (options: SaveOptions) => model,
    // //         recover: async (options: SaveOptions) => model,
    // //         reload: async () => {},
    // //     };
    // // };

    // const testAdmin: Admin & { userId: string; orgId: string } = {
    //     id: "id",
    //     firebaseId: "firebaseId",
    //     name: "name",
    //     twoFactorEnabled: true,
    //     user: testUser,
    //     org: org(),
    //     identityVerification: [],
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //     hasId: () => true,
    //     save: async (options) => testAdmin,
    //     remove: async (options) => testAdmin,
    //     softRemove: async (options) => testAdmin,
    //     recover: async (options) => testAdmin,
    //     reload: async () => {},
    //     asV1: () => testAdmin,
    //     userId: "userId",
    //     orgId: "orgId",
    // };

    // const admin = (): Admin & { userId: string; orgId: string } => {
    //     return {
    //         id: "id",
    //         firebaseId: "firebaseId",
    //         name: "name",
    //         twoFactorEnabled: true,
    //         user: user(),
    //         org: org(),
    //         identityVerification: [],
    //         createdAt: new Date(),
    //         updatedAt: new Date(),
    //         hasId: () => true,
    //         save: async (options) => testAdmin,
    //         remove: async (options) => testAdmin,
    //         softRemove: async (options) => testAdmin,
    //         recover: async (options) => testAdmin,
    //         reload: async () => {},
    //         asV1: () => testAdmin,
    //         userId: "userId",
    //         orgId: "orgId",
    //     };
    // };

    // const profile = (): Profile => {
    //     return {
    //         id: "id",
    //         username: "username",
    //         recoveryCode: "recoveryCode",
    //         deviceToken: "deviceToken",
    //         email: "email",
    //         profilePicture: "profilePicture",
    //         ageRange: "ageRange",
    //         city: "city",
    //         state: "state",
    //         country: "country",
    //         createdAt: new Date(),
    //         deletedAt: new Date(),
    //         updatedAt: new Date(),
    //         platforms: [],
    //         interests: [],
    //         values: [],
    //         user: user(),
    //         isRecoveryCodeValid: (code) => true,
    //         hasId: () => true,
    //         save: async (options) => profile(),
    //         remove: async (options) => profile(),
    //         softRemove: async (options) => profile(),
    //         recover: async (options) => profile(),
    //         reload: async () => {},
    //     };
    // };

    // const notificationSettings = (): NotificationSettings => {
    //     return {
    //         id: "id",
    //         kyc: true,
    //         withdraw: true,
    //         campaignCreate: true,
    //         campaignUpdates: true,
    //         createdAt: new Date(),
    //         updatedAt: new Date(),
    //         user: user(),
    //         hasId: () => true,
    //         save: async (options) => notificationSettings(),
    //         remove: async (options) => notificationSettings(),
    //         softRemove: async (options) => notificationSettings(),
    //         recover: async (options) => notificationSettings(),
    //         reload: async () => {},
    //     };
    // };

    // const campaign: Campaign & { org: Org | null } = {
    //     beginDate: new Date(),
    //     endDate: new Date(),
    //     coiinTotal: "total",
    //     target: "target",
    //     description: "description",
    //     name: "name",
    //     id: "id",
    //     company: "company",
    //     totalParticipationScore: "score",
    //     algorithm: "algorithm",
    //     audited: true,
    //     targetVideo: "target video",
    //     imagePath: "image",
    //     tagline: "line",
    //     suggestedPosts: "posts",
    //     suggestedTags: "tags",
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //     requirements: "requirements",
    //     orgId: "id",
    //     type: "type",
    //     status: "status",
    //     cryptoId: "id",
    //     keywords: "keywords",
    //     campaignType: "type",
    //     socialMediaType: "type",
    //     instructions: "instructions",
    //     tatumBlockageId: "tatum",
    //     symbol: "symbol",
    //     auditStatus: "status",
    //     isGlobal: true,
    //     showUrl: true,
    //     currencyId: "id",
    //     org: org(),
    // };

    const body: CreateCampaignParams = {
        name: "raiinmaker",
        coiinTotal: "total",
        target: "target",
        targetVideo: "targetVideo",
        beginDate: new Date(),
        endDate: new Date(),
        description: "descriptions",
        instructions: "instructions",
        symbol: "symbol",
        network: "network",
        company: RAIINMAKER_ORG_NAME,
        algorithm: "algorithm",
        imagePath: "path",
        requirements: JSON,
        campaignMedia: [],
        campaignTemplates: [],
        campaignType: "type",
        socialMediaType: [],
        tagline: "line",
        suggestedPosts: [],
        suggestedTags: [],
        keywords: [],
        type: "type",
        raffle_prize: {
            id: "id",
            displayName: "name",
            image: true,
            affiliateLink: "link",
            updatedAt: new Date(),
            createdAt: new Date(),
            campaignId: "campaignId",
        },
        isGlobal: true,
        showUrl: true,
    };

    // const verificationApp: VerificationApplication & { userId: string; adminId: string } = {
    //     id: "id",
    //     applicationId: "appId",
    //     level: KycLevel.LEVEL1,
    //     profile: "profile",
    //     status: KycStatus.APPROVED,
    //     reason: "reason",
    //     user: user(),
    //     admin: admin(),
    //     factors: [],
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //     updateAppId: async (appId) => verificationApp,
    //     updateStatus: async (newStatus) => verificationApp,
    //     updateReason: async (reason) => verificationApp,
    //     hasId: () => true,
    //     save: async (options) => verificationApp,
    //     remove: async (options) => verificationApp,
    //     softRemove: async (options) => verificationApp,
    //     recover: async (options) => verificationApp,
    //     reload: async () => {},
    //     userId: "id",
    //     adminId: "id",
    // };

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer, {
            mount: {
                "/v1": [AuthenticationController],
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
        adminService = PlatformTest.get<AdminService>(AdminService);
        // campaignService = PlatformTest.get<CampaignService>(CampaignService);
        // userService = PlatformTest.get<UserService>(UserService);
        // marketDataService = PlatformTest.get<MarketDataService>(MarketDataService);
        // userAuthMiddleware = PlatformTest.get(UserAuthMiddleware);
        sessionService = PlatformTest.get<SessionService>(SessionService);
        // verificationApplicationService =
        PlatformTest.get<VerificationApplicationService>(VerificationApplicationService);
        jest.spyOn(sessionService, "verifySession").mockImplementation(async (token) => {
            return { userId: "user" };
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should throw ADMIN_NOT_FOUND", async () => {
        const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(null);
        const res = await request.post(createCampaignRoute).set("Authorization", "token").send(body);

        handleBaseAssertions(res, 404, ADMIN_NOT_FOUND, checkPermissionsSpy, findAdminByFirebaseIdSpy);
    });

    // it("should throw KYC_NOT_FOUND", async () => {
    //     const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
    //     const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin());
    //     const findVerificationApplicationByAdminIdSpy = jest
    //         .spyOn(verificationApplicationService, "findVerificationApplicationByAdminId")
    //         .mockResolvedValue(null);
    //     const res = await request.post(createCampaignRoute).set("Authorization", "token").send(body);

    //     console.log(res.body);

    //     handleBaseAssertions(
    //         res,
    //         400,
    //         KYC_NOT_FOUND,
    //         checkPermissionsSpy,
    //         findAdminByFirebaseIdSpy,
    //         findVerificationApplicationByAdminIdSpy
    //     );
    // });

    // it("should throw bad request if campaign is global and exits", async () => {
    //     const checkPermissionsSpy = jest
    //         .spyOn(adminService, "checkPermissions")
    //         .mockResolvedValue({ role: "role", orgId: "id", company: "raiinmaker", email: "me@raiinmaker.com" });
    //     const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin());
    //     const findVerificationApplicationByAdminIdSpy = jest
    //         .spyOn(verificationApplicationService, "findVerificationApplicationByAdminId")
    //         .mockResolvedValue(verificationApp);
    //     const findGobalCampaignSpy = jest.spyOn(campaignService, "findGlobalCampaign").mockResolvedValue(campaign);

    //     const res = await request.post(createCampaignRoute).set("Authorization", "token").send(body);
    //     handleBaseAssertions(
    //         res,
    //         400,
    //         null,
    //         checkPermissionsSpy,
    //         findAdminByFirebaseIdSpy,
    //         findVerificationApplicationByAdminIdSpy,
    //         findGobalCampaignSpy
    //     );
    // });
});
