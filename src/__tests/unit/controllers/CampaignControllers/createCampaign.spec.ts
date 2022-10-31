import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { handleBaseAssertions, createCampaignRoute } from "../../../test_helper";
import { AdminService } from "../../../../services/AdminService";
import { SessionService } from "../../../../services/SessionService";
import { CreateCampaignParams } from "../../../../models/RestModels";
import { ADMIN_NOT_FOUND, KYC_NOT_FOUND } from "../../../../util/errors";
import { VerificationApplicationService } from "../../../../services/VerificationApplicationService";
import { KycStatus, RAIINMAKER_ORG_NAME } from "../../../../util/constants";
import { CampaignService } from "../../../../services/CampaignService";
import { Admin, Campaign, Org, VerificationApplication } from "@prisma/client";
// import { OrganizationService } from "../../../../services/OrganizationService";
// import { Validator } from "../../../../schemas";
// import { WalletService } from "../../../../services/WalletService";
// import { TatumService } from "../../../../services/TatumService";

describe("Create campaign", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let adminService: AdminService;
    let campaignService: CampaignService;
    // let marketDataService: MarketDataService;
    // let userService: UserService;
    let sessionService: SessionService;
    let verificationApplicationService: VerificationApplicationService;
    // let organizationService: OrganizationService
    // let validator: Validator;
    // let walletService: WalletService;
    // let tatumService: TatumService
    interface IBody {
        isGlobal: boolean;
        isRaffle: boolean;
    }

    const json: JSON = {
        parse: (text) => {},
        stringify: (value) => "value",
        [Symbol.toStringTag]: "",
    };

    const body = ({ isGlobal, isRaffle }: IBody): CreateCampaignParams => {
        return {
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
            requirements: json,
            campaignMedia: [],
            campaignTemplates: [],
            campaignType: "type",
            socialMediaType: [],
            tagline: "line",
            suggestedPosts: [],
            suggestedTags: [],
            keywords: [],
            type: isRaffle ? "raffle" : "crypto",
            raffle_prize: {
                id: "id",
                displayName: "name",
                image: true,
                affiliateLink: "link",
                updatedAt: new Date(),
                createdAt: new Date(),
                campaignId: "campaignId",
            },
            isGlobal: isGlobal,
            showUrl: true,
        };
    };

    const admin: Admin = {
        firebaseId: "firebaseId",
        id: "id",
        userId: "userId",
        orgId: "orgId",
        name: "name",
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorEnabled: true,
    };

    const verificationApp = (isApproved: boolean): VerificationApplication => {
        return {
            applicationId: "app Id",
            status: isApproved ? KycStatus.APPROVED : KycStatus.PENDING,
            userId: "userId",
            createdAt: new Date(),
            updatedAt: new Date(),
            reason: "reason",
            id: "id",
            level: "LEVEL1",
            profile: "profile",
            adminId: "adminId",
        };
    };

    const campaign: Campaign & { org: Org } = {
        beginDate: new Date(),
        endDate: new Date(),
        coiinTotal: "total",
        target: "target",
        description: "description",
        name: "name",
        id: "id",
        company: "raiinmaker",
        totalParticipationScore: "score",
        algorithm: "algorithm",
        audited: true,
        targetVideo: "target video",
        imagePath: "image",
        tagline: "line",
        suggestedPosts: "posts",
        suggestedTags: "tags",
        createdAt: new Date(),
        updatedAt: new Date(),
        requirements: {},
        orgId: "id",
        type: "coiin",
        status: "status",
        cryptoId: "id",
        keywords: "keywords",
        campaignType: "type",
        socialMediaType: "type",
        instructions: "instructions",
        tatumBlockageId: "tatum",
        symbol: "symbol",
        auditStatus: "status",
        isGlobal: true,
        showUrl: true,
        currencyId: "id",
        org: {
            id: "id",
            name: "name",
            createdAt: new Date(),
            updatedAt: new Date(),
            stripeId: "stripeId",
            logo: "logo",
        },
    };

    // const org: Org = {
    //     id: "id",
    //     name: "name",
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //     stripeId: "stripeId",
    //     logo: "logo"
    // }

    // const wallet: Wallet = {
    //     id: "id",
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //     orgId: "orgId",
    //     userId: "userId"
    // }

    // const currency: Currency = {
    //     id: "id",
    //     tatumId: "tatumId",
    //     symbol: "symbop",
    //     depositAddress: "0x000000",
    //     memo: "memo",
    //     message: "message",
    //     destinationTag: 2,
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //     walletId: "walletId",
    //     derivationKey: 3,
    //     tokenId: "tokenId",
    //     accountBalance: 0,
    //     availableBalance: 0
    // }

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        adminService = PlatformTest.get<AdminService>(AdminService);
        campaignService = PlatformTest.get<CampaignService>(CampaignService);
        // userService = PlatformTest.get<UserService>(UserService);
        // marketDataService = PlatformTest.get<MarketDataService>(MarketDataService);
        // walletService = PlatformTest.get<WalletService>(WalletService);
        // organizationService = PlatformTest.get<OrganizationService>(OrganizationService)
        sessionService = PlatformTest.get<SessionService>(SessionService);
        // tatumService = PlatformTest.get(TatumService);
        verificationApplicationService =
            PlatformTest.get<VerificationApplicationService>(VerificationApplicationService);
        // validator = new Validator();
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
        const res = await request
            .post(createCampaignRoute)
            .set("Authorization", "token")
            .send(body({ isGlobal: false, isRaffle: false }));

        handleBaseAssertions(res, 404, ADMIN_NOT_FOUND, checkPermissionsSpy, findAdminByFirebaseIdSpy);
    });

    it("should throw KYC_NOT_FOUND", async () => {
        const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
        const findVerificationApplicationByAdminIdSpy = jest
            .spyOn(verificationApplicationService, "findVerificationApplicationByAdminId")
            .mockResolvedValue(null);
        const res = await request
            .post(createCampaignRoute)
            .set("Authorization", "token")
            .send(body({ isGlobal: false, isRaffle: false }));

        handleBaseAssertions(
            res,
            400,
            KYC_NOT_FOUND,
            checkPermissionsSpy,
            findAdminByFirebaseIdSpy,
            findVerificationApplicationByAdminIdSpy
        );
    });

    it("should throw bad request if campaign is global and exits", async () => {
        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "role", orgId: "id", company: RAIINMAKER_ORG_NAME, email: "me@raiinmaker.com" });
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
        const findVerificationApplicationByAdminIdSpy = jest
            .spyOn(verificationApplicationService, "findVerificationApplicationByAdminId")
            .mockResolvedValue(verificationApp(true));
        const findGobalCampaignSpy = jest.spyOn(campaignService, "findGlobalCampaign").mockResolvedValue(campaign);

        const res = await request
            .post(createCampaignRoute)
            .set("Authorization", "token")
            .send(body({ isGlobal: true, isRaffle: false }));
        console.log(res.body);

        handleBaseAssertions(
            res,
            400,
            null,
            checkPermissionsSpy,
            findAdminByFirebaseIdSpy,
            findVerificationApplicationByAdminIdSpy,
            findGobalCampaignSpy
        );
    });

    // it("should throw org not found", async () => {
    //     const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({ role: "role", orgId: "id", company: RAIINMAKER_ORG_NAME, email: "me@raiinmaker.com" });
    //     const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
    //     const findVerificationApplicationByAdminIdSpy = jest.spyOn(verificationApplicationService, "findVerificationApplicationByAdminId").mockResolvedValue(verificationApp(true))

    //     const parseJsonSpy = jest.spyOn(JSON, "parse").mockImplementation((text) => { })
    //     const validateAlgorithmCreateSchemaSpy = jest.spyOn(validator, "validateAlgorithmCreateSchema").mockImplementation((payload) => { });
    //     jest.spyOn(validator, "validateCampaignRequirementsSchema").mockImplementation((payload) => { });
    //     const findOrganizationByNameSpy = jest.spyOn(organizationService, "findOrganizationByName").mockResolvedValue(null);

    //     const res = await request.post(createCampaignRoute).set("Authorization", "token").send(body({ isGlobal: false, isRaffle: false }));
    //     console.log(res.body);

    //     handleBaseAssertions(res, 404, ORG_NOT_FOUND, checkPermissionsSpy, findAdminByFirebaseIdSpy, findVerificationApplicationByAdminIdSpy, validateAlgorithmCreateSchemaSpy, findOrganizationByNameSpy, parseJsonSpy);

    // })

    // it("should create campaign", async () => {
    //     const checkPermissionsSpy = jest
    //         .spyOn(adminService, "checkPermissions")
    //         .mockResolvedValue({ role: "role", orgId: "id", company: RAIINMAKER_ORG_NAME, email: "me@raiinmaker.com" });
    //     const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
    //     const findVerificationApplicationByAdminIdSpy = jest
    //         .spyOn(verificationApplicationService, "findVerificationApplicationByAdminId")
    //         .mockResolvedValue(verificationApp(true));

    //     const parseSpy = jest.spyOn(JSON, "parse").mockImplementation((text) => { });
    //     const validateAlgorithmCreateSchemaSpy = jest.spyOn(validator, "validateAlgorithmCreateSchema").mockImplementation((payload) => { });
    //     const validateCampaignRequirementsSchemaSpy = jest.spyOn(validator, "validateCampaignRequirementsSchema").mockImplementation((payload) => { });
    //     const findOrganizationByNameSpy = jest.spyOn(organizationService, "findOrganizationByName").mockResolvedValue(org);
    //     const findWalletByOrgIdSpy = jest.spyOn(walletService, "findWalletByOrgId").mockResolvedValue(wallet)
    //     const findOrCreateCurrencySpy = jest.spyOn(tatumService, "findOrCreateCurrency").mockImplementation(async (data) => currency)
    //     const findCampaingByNameSpy = jest.spyOn(campaignService, "findCampaingByName").mockResolvedValue(null);

    //     const res = await request.post(createCampaignRoute).set("Authorization", "token").send(body({ isGlobal: false, isRaffle: false }));
    //     console.log(res.body);

    //     handleBaseAssertions(
    //         res,
    //         400,
    //         CAMPAIGN_NAME_EXISTS,
    //         checkPermissionsSpy,
    //         findAdminByFirebaseIdSpy,
    //         findVerificationApplicationByAdminIdSpy,
    //         parseSpy,
    //         validateAlgorithmCreateSchemaSpy,
    //         validateCampaignRequirementsSchemaSpy,
    //         findOrganizationByNameSpy,
    //         findWalletByOrgIdSpy,
    //         findOrCreateCurrencySpy,
    //         findCampaingByNameSpy,
    //     );
    // })
});
