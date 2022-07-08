import { Injectable } from "@tsed/di";
import { readPrisma } from "../clients/prisma";

@Injectable()
export class TatumWalletService {
    public async findTatumWallet(symbol: string) {
        return readPrisma.tatumWallet.findFirst({ where: { currency: symbol } });
    }
}
