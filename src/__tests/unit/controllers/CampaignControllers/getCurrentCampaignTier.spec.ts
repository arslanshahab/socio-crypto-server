import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { handleBaseAssertions, currentCampaignTierRoute } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { CampaignIdModel, CurrentCampaignTierModel } from "../../../../models/RestModels";
import { CampaignService } from "../../../../services/CampaignService";

describe("Current Campaign Tier", () => {
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
        await PlatformTest.bootstrap(RestServer)();
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
