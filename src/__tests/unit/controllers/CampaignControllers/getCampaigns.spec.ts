import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import { AuthenticationController } from "../../../../controllers/v1/AuthenticationController";
// import { ListCampaignsVariablesModel } from "../../../../controllers/v1/CampaignController";
import * as bodyParser from "body-parser";
import SuperTest from "supertest";

import { handleBaseAssertions, campaignRoute } from "../../../test_helper";

import { AdminService } from "../../../../services/AdminService";
import { UserService } from "../../../..//services/UserService";
import {
    Campaign,
    CampaignMedia,
    CampaignTemplate,
    CryptoCurrency,
    Currency,
    Participant,
    Token,
    User,
} from "@prisma/client";
import { CampaignService } from "../../../../services/CampaignService";
import { MarketDataService } from "../../../../services/MarketDataService";

// import { UserAuthMiddleware } from "../../../../middleware/UserAuthMiddleware";
import { SessionService } from "../../../../services/SessionService";
// import { CampaignState, CampaignAuditStatus } from "../../../../util/constants";

describe("Admin login", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let adminService: AdminService;
    let campaignService: CampaignService;
    let marketDataService: MarketDataService;
    let userService: UserService;
    // let userAuthMiddleware: UserAuthMiddleware;
    let sessionService: SessionService;

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

    const campaign: [
        (Campaign & {
            participant: Participant[];
            crypto_currency: CryptoCurrency | null;
            campaign_media: CampaignMedia[];
            campaign_template: CampaignTemplate[];
            currency: (Currency & { token: Token }) | null;
        })[],
        number
    ] = [
        [
            {
                beginDate: new Date(),
                endDate: new Date(),
                coiinTotal: "total",
                target: "target",
                description: "description",
                name: "name",
                id: "id",
                company: "company",
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
                requirements: "requirements",
                orgId: "id",
                type: "type",
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

                currency: {
                    id: "id",
                    tatumId: "tatumId",
                    symbol: "symbol",
                    depositAddress: "deposit address",
                    memo: "memo",
                    message: "message",
                    destinationTag: 3,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    walletId: "walletId",
                    derivationKey: 3,
                    tokenId: "tokenId",
                    accountBalance: 3,
                    availableBalance: 3,
                    token: {
                        id: "id",
                        network: "network",
                        contractAddress: "address",
                        symbol: "symbol",
                        updatedAt: new Date(),
                        enabled: true,
                        createdAt: new Date(),
                    },
                },
                participant: [],
                crypto_currency: {
                    type: "type",
                    id: "id",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    contractAddress: "address",
                },
                campaign_media: [],
                campaign_template: [],
            },
        ],
        4,
    ];

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
        campaignService = PlatformTest.get<CampaignService>(CampaignService);
        userService = PlatformTest.get<UserService>(UserService);
        marketDataService = PlatformTest.get<MarketDataService>(MarketDataService);
        // userAuthMiddleware = PlatformTest.get(UserAuthMiddleware);
        sessionService = PlatformTest.get<SessionService>(SessionService);

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

    it("should get all campaigns", async () => {
        // const campaignVariables = {
        //     state: CampaignState.ALL,
        //     status: "ALL",
        //     userRelated: true,
        //     auditStatus: CampaignAuditStatus.AUDITED,
        //     skip: 3,
        //     take: 2,
        // };

        const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(activeUser);
        const findCampaignByStatusSpy = jest
            .spyOn(campaignService, "findCampaignsByStatus")
            .mockResolvedValue(campaign);
        const getTokenValueInUSDSpy = jest.spyOn(marketDataService, "getTokenValueInUSD").mockResolvedValue(3);

        const res = await request.get(campaignRoute).set("Authorization", "token").query({
            skip: 3,
            take: 2,
            state: "ALL",
            status: "ALL",
            // userRelated: true,
            // auditStatus: "AUDITED",
        });
        console.log(res.body);

        handleBaseAssertions(
            res,
            200,
            null,
            checkPermissionsSpy,
            findUserByContextSpy,
            findCampaignByStatusSpy,
            getTokenValueInUSDSpy
        );
    });
});
