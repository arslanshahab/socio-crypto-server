import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import { AuthenticationController } from "../../../../controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";
import SuperTest from "supertest";

import { handleBaseAssertions, campaignMetricsRoute } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";

import { CampaignIdModel } from "../../../../models/RestModels";
import { AdminService } from "../../../../services/AdminService";

import { ParticipantService } from "../../../../services/ParticipantService";
import { SocialPostService } from "../../../../services/SocialPostService";

describe("Admin login", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let participantService: ParticipantService;
    let socialPostService: SocialPostService;

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
        sessionService = PlatformTest.get<SessionService>(SessionService);
        participantService = PlatformTest.get<ParticipantService>(ParticipantService);
        socialPostService = PlatformTest.get<SocialPostService>(SocialPostService);

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

    it("should get campaign metrics", async () => {
        const query: CampaignIdModel = {
            campaignId: "id",
        };

        const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
        const findParticipantSpy = jest.spyOn(participantService, "findParticipants").mockResolvedValue([]);
        const findSocialPostMetricsByIdSpy = jest
            .spyOn(socialPostService, "findSocialPostMetricsById")
            .mockResolvedValue([]);

        const res = await request.get(campaignMetricsRoute).set("Authorization", "token").query(query);

        handleBaseAssertions(res, 200, null, checkPermissionsSpy, findParticipantSpy, findSocialPostMetricsByIdSpy);
    });
});
