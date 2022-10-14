import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import { AuthenticationController } from "../../../../controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";
import SuperTest from "supertest";

import { handleBaseAssertions, currentCampaignTierRoute } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";

import { CampaignIdModel, CurrentCampaignTierModel } from "../../../../models/RestModels";

import { CampaignService } from "../../../../services/CampaignService";

describe("Admin login", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;

    let campaignService: CampaignService;

    const campaignTier: CurrentCampaignTierModel = {
        currentTier: 3,
        currentTotal: 3,
        campaignType: "crypto",
        tokenValueCoiin: "100",
        tokenValueUsd: "100",
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
        sessionService = PlatformTest.get<SessionService>(SessionService);
        campaignService = PlatformTest.get(CampaignService);
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

    it("should get campaign tier", async () => {
        const query: CampaignIdModel = {
            campaignId: "id",
        };

        const currentCampaignTierSpy = jest
            .spyOn(campaignService, "currentCampaignTier")
            .mockResolvedValue(campaignTier);

        const res = await request.get(currentCampaignTierRoute).set("Authorization", "token").query(query);

        handleBaseAssertions(res, 200, null, currentCampaignTierSpy);
    });
});
