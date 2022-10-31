import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { deleteFromWallet as deleteFromWalletRoute, handleBaseAssertions } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { AdminService } from "../../../../services/AdminService";
import { DeleteCryptoFromWalletParams } from "../../../../controllers/v1/CryptoController";
import { OrganizationService } from "../../../../services/OrganizationService";
import { ORG_NOT_FOUND } from "../../../../util/errors";
import { Org, WalletCurrency } from "@prisma/client";
import { WalletCurrencyService } from "../../../../services/WalletCurrencyService";

describe("delete crypto to wallet", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let organizationService: OrganizationService;
    let walletCurrencyService: WalletCurrencyService;
    const body: DeleteCryptoFromWalletParams = {
        id: "id",
    };

    const org: Org = {
        id: "id",
        name: "name",
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeId: "stripeId",
        logo: "logo",
    };

    const walletCurrency: WalletCurrency = {
        id: "id",
        type: "type",
        balance: "0",
        walletId: "walletId",
        updatedAt: new Date(),
        createdAt: new Date(),
    };

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        sessionService = PlatformTest.get<SessionService>(SessionService);
        adminService = PlatformTest.get<AdminService>(AdminService);
        organizationService = PlatformTest.get<OrganizationService>(OrganizationService);
        walletCurrencyService = PlatformTest.get(WalletCurrencyService);
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

    it("should throw company not found", async () => {
        const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
        const res = await request.delete(deleteFromWalletRoute).set("Authorization", "token").send(body);
        handleBaseAssertions(res, 404, null, checkPermissionsSpy);
    });

    it("should throw org not found", async () => {
        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "role", company: "raiinmaker", orgId: "id", email: "me@raiinmaker.com" });
        const findOrganizationByNameSpy = jest
            .spyOn(organizationService, "findOrganizationByName")
            .mockResolvedValue(null);
        const res = await request.delete(deleteFromWalletRoute).set("Authorization", "token").send(body);
        handleBaseAssertions(res, 404, ORG_NOT_FOUND, checkPermissionsSpy, findOrganizationByNameSpy);
    });

    it("should throw cryptoCurrency not found", async () => {
        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "role", company: "raiinmaker", orgId: "id", email: "me@raiinmaker.com" });
        const findOrganizationByNameSpy = jest
            .spyOn(organizationService, "findOrganizationByName")
            .mockResolvedValue(org);
        const findWalletCurrencyByWalletIdSpy = jest
            .spyOn(walletCurrencyService, "findWalletCurrencyByWalletId")
            .mockResolvedValue(null);
        const res = await request.delete(deleteFromWalletRoute).set("Authorization", "token").send(body);
        handleBaseAssertions(
            res,
            404,
            null,
            checkPermissionsSpy,
            findOrganizationByNameSpy,
            findWalletCurrencyByWalletIdSpy
        );
    });

    it("should delete crypto from wallet", async () => {
        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "role", company: "raiinmaker", orgId: "id", email: "me@raiinmaker.com" });
        const findOrganizationByNameSpy = jest
            .spyOn(organizationService, "findOrganizationByName")
            .mockResolvedValue(org);
        const findWalletCurrencyByWalletIdSpy = jest
            .spyOn(walletCurrencyService, "findWalletCurrencyByWalletId")
            .mockResolvedValue(walletCurrency);
        const deleteWalletCurrencySpy = jest
            .spyOn(walletCurrencyService, "deleteWalletCurrency")
            .mockResolvedValue(walletCurrency);
        const res = await request.delete(deleteFromWalletRoute).set("Authorization", "token").send(body);
        handleBaseAssertions(
            res,
            200,
            null,
            checkPermissionsSpy,
            findOrganizationByNameSpy,
            findWalletCurrencyByWalletIdSpy,
            deleteWalletCurrencySpy
        );
    });
});
