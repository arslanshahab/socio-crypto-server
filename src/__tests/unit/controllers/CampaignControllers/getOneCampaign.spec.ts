import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import { AuthenticationController } from "../../../../controllers/v1/AuthenticationController";
// import { ListCampaignsVariablesModel } from "../../../../controllers/v1/CampaignController";
import * as bodyParser from "body-parser";
import SuperTest from "supertest";

import { handleBaseAssertions, getOneCampaignRoute } from "../../../test_helper";

// import { AdminService } from "../../../../services/AdminService";
// import { UserService } from "../../../../services/UserService";
import { Campaign, CampaignMedia, CampaignTemplate, CryptoCurrency, Currency, Token } from "@prisma/client";
import { CampaignService } from "../../../../services/CampaignService";
import { MarketDataService } from "../../../../services/MarketDataService";

// import { UserAuthMiddleware } from "../../../../middleware/UserAuthMiddleware";
import { SessionService } from "../../../../services/SessionService";
import { CAMPAIGN_NOT_FOUND } from "../../../../util/errors";
import { CampaignResultModel } from "../../../../models/RestModels";

describe("Admin login", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let campaignService: CampaignService;
    let marketDataService: MarketDataService;
    let sessionService: SessionService;

    const campaign:
        | (Campaign & {
              currency:
                  | (Currency & {
                        token: Token | null;
                    })
                  | null;
              crypto_currency: CryptoCurrency | null;
              campaign_media: CampaignMedia[];
              campaign_template: CampaignTemplate[];
          })
        | null = {
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

        crypto_currency: {
            type: "type",
            id: "id",
            createdAt: new Date(),
            updatedAt: new Date(),
            contractAddress: "address",
        },
        campaign_media: [],
        campaign_template: [],
    };

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
        campaignService = PlatformTest.get<CampaignService>(CampaignService);
        marketDataService = PlatformTest.get<MarketDataService>(MarketDataService);
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

    it("should throw CAMPAIGN_NOT_FOUND", async () => {
        const findCampaignByIdSpy = jest.spyOn(campaignService, "findCampaignById").mockResolvedValue(null);
        const res = await request.get(getOneCampaignRoute + "1234").set("Authorization", "token");

        handleBaseAssertions(res, 404, CAMPAIGN_NOT_FOUND, findCampaignByIdSpy);
    });

    it("should return campaign with id 1234", async () => {
        const findCampaignByIdSpy = jest.spyOn(campaignService, "findCampaignById").mockResolvedValue(campaign);
        const getTokenValueInUSDSpy = jest.spyOn(marketDataService, "getTokenValueInUSD").mockResolvedValue(200);
        const buildCampaignSpy = jest.spyOn(CampaignResultModel, "build").mockResolvedValue(campaign);
        const res = await request.get(getOneCampaignRoute + "1234").set("Authorization", "token");

        handleBaseAssertions(res, 200, null, findCampaignByIdSpy, getTokenValueInUSDSpy, buildCampaignSpy);
    });
});
