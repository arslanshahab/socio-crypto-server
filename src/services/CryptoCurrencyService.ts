import { Injectable } from "@tsed/di";
import { readPrisma } from "../clients/prisma";

@Injectable()
export class CryptoCurrencyService {
    public async findCryptoCurrencyById(cryptoId: string) {
        return readPrisma.cryptoCurrency.findFirst({
            where: {
                id: cryptoId,
            },
        });
    }

    public async findCryptoCurrencies() {
        return readPrisma.cryptoCurrency.findMany();
    }

    public async findByContractAddress(contractAddress: string) {
        return readPrisma.cryptoCurrency.findFirst({ where: { contractAddress } });
    }
}
