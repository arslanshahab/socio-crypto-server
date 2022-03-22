import { registerProvider } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { prisma } from "../clients/prisma";

// override the default prisma service to avoid multiple prisma clients
registerProvider({
    provide: PrismaService,
    useValue: prisma,
});
