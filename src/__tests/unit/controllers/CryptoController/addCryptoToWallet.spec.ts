import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
// import { AuthenticationController } from "../../../../controllers/v1/AuthenticationController";
// import * as bodyParser from "body-parser";
import SuperTest from "supertest";
import { addToWalletRoute, handleBaseAssertions } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { AdminService } from "../../../../services/AdminService";
import { CryptoToWalletParams } from "../../../../controllers/v1/CryptoController";
import { OrganizationService } from "../../../../services/OrganizationService";
import { ORG_NOT_FOUND } from "../../../../util/errors";
import { CryptoCurrency, Org, WalletCurrency } from "@prisma/client";
import { CryptoCurrencyService } from "../../../../services/CryptoCurrencyService";
import { WalletCurrencyService } from "../../../../services/WalletCurrencyService";

describe("Add crypto to wallet", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let organizationService: OrganizationService;
    let cryptoCurrencyService: CryptoCurrencyService;
    let walletCurrencyService: WalletCurrencyService;

    const body: CryptoToWalletParams = {
        contractAddress: "0x0000",
    };
    const org: Org = {
        id: "id",
        name: "name",
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeId: "stripeId",
        logo: "logo",
    };
    const currency: CryptoCurrency = {
        id: "id",
        type: "type",
        contractAddress: "0x000",
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const walletCurrency: WalletCurrency = {
        id: "id",
        type: "type",
        balance: "balance",
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
        cryptoCurrencyService = PlatformTest.get(CryptoCurrencyService);
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
        const res = await request.post(addToWalletRoute).set("Authorization", "token").send(body);
        handleBaseAssertions(res, 404, null, checkPermissionsSpy);
    });

    it("should throw org not found", async () => {
        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "role", company: "raiinmaker", orgId: "id", email: "me@raiinmaker.com" });
        const findOrganizationByNameSpy = jest
            .spyOn(organizationService, "findOrganizationByName")
            .mockResolvedValue(null);
        const res = await request.post(addToWalletRoute).set("Authorization", "token").send(body);
        handleBaseAssertions(res, 404, ORG_NOT_FOUND, checkPermissionsSpy, findOrganizationByNameSpy);
    });

    it("should throw cryptoCurrency not found", async () => {
        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "role", company: "raiinmaker", orgId: "id", email: "me@raiinmaker.com" });
        const findOrganizationByNameSpy = jest
            .spyOn(organizationService, "findOrganizationByName")
            .mockResolvedValue(org);
        const findByContractAddressSpy = jest
            .spyOn(cryptoCurrencyService, "findByContractAddress")
            .mockResolvedValue(null);
        const res = await request.post(addToWalletRoute).set("Authorization", "token").send(body);
        handleBaseAssertions(res, 404, null, checkPermissionsSpy, findOrganizationByNameSpy, findByContractAddressSpy);
    });

    it("should add crypto to wallet", async () => {
        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "role", company: "raiinmaker", orgId: "id", email: "me@raiinmaker.com" });
        const findOrganizationByNameSpy = jest
            .spyOn(organizationService, "findOrganizationByName")
            .mockResolvedValue(org);
        const findByContractAddressSpy = jest
            .spyOn(cryptoCurrencyService, "findByContractAddress")
            .mockResolvedValue(currency);
        const newWalletCurrencySpy = jest
            .spyOn(walletCurrencyService, "newWalletCurrency")
            .mockResolvedValue(walletCurrency);
        const res = await request.post(addToWalletRoute).set("Authorization", "token").send(body);
        handleBaseAssertions(
            res,
            200,
            null,
            checkPermissionsSpy,
            findOrganizationByNameSpy,
            findByContractAddressSpy,
            newWalletCurrencySpy
        );
    });
});
