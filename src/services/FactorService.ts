import { Injectable } from "@tsed/di";
import { WebhookBody } from "../controllers/v1/MyfiiController";
import { prisma, readPrisma } from "../clients/prisma";
import { MYFII } from "src/util/constants.ts";

@Injectable()
export class FactorService {
    public async findAllByUser(userId: string) {
        return readPrisma.factor.findMany({ where: { userId } });
    }

    public async create(data: { name: string; value: string; type: string; userId: string; provider: string }) {
        const { name, value, type, userId, provider } = data;
        return await prisma.factor.create({
            data: {
                name,
                type,
                value,
                provider,
                userId,
            },
        });
    }

    public async createMany(data: WebhookBody, userId: string) {
        return await Promise.all(
            data.factors.map(async (item) => {
                await this.create({
                    name: item.factorName,
                    type: item.factorType,
                    value: item.factorData,
                    provider: MYFII,
                    userId,
                });
            })
        );
    }
}
