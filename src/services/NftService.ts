import { Inject, Injectable } from "@tsed/di";
import { NftFileParams, NftMintingParams } from "types";
import { DragonChainService } from "./DragonChainService";
import { prisma, readPrisma } from "../clients/prisma";
import { Prisma } from "@prisma/client";
import { NftResultModel } from "src/models/RestModels";
import { NftName, SupportedNetwork } from "../util/constants";

@Injectable()
export class NftService {
    @Inject()
    private dragonChainService: DragonChainService;

    public async findByNftId(nftId: string) {
        return await readPrisma.nft.findUnique({ where: { nftId } });
    }

    public async findProfilePictureNftOfUser(userId: string) {
        return Boolean(await readPrisma.nft.findFirst({ where: { userId, name: NftName.PROFILE_PICTURE } }));
    }

    public async getUserNfts(userId: string) {
        const localNftList = await readPrisma.nft.findMany({ where: { userId } });
        const augmentedList = [];
        for (const nft of localNftList) {
            const data = await this.getNftTransactionsCombined(nft.transactions as Prisma.JsonObject);
            augmentedList.push({ ...data, network: nft.network });
        }
        return augmentedList;
    }

    private async getNftTransactionsCombined(localNftTransactionObject: Prisma.JsonObject): Promise<NftResultModel> {
        const ids = Object.values(localNftTransactionObject) as string[];
        const txns = await this.dragonChainService.getBulkTransaction(ids);
        let data = {};
        for (const tx of txns) {
            data = { ...(data && data), ...tx.header, ...tx.payload };
        }
        return data as NftResultModel;
    }

    private async saveNft(
        data: NftMintingParams & NftFileParams & { mintTxId: string; fileTxId?: string; network: SupportedNetwork }
    ) {
        const { userId, nftId, name, type, mintTxId, fileTxId, network } = data;
        return await prisma.nft.create({
            data: {
                userId,
                nftId,
                name,
                type,
                transactions: { mintTxId, fileTxId },
                network,
            },
        });
    }

    public async mintNFT(data: NftMintingParams & NftFileParams) {
        const { userId, nftId, name, type, file, userfields } = data;
        const mintTxId = await this.dragonChainService.mintNFT({ userId, nftId, name, type });
        const fileTxId = await this.dragonChainService.attachFileToNFT({ nftId, file, mintTxId, userfields });
        return await this.saveNft({ ...data, mintTxId, fileTxId, network: SupportedNetwork.DRAGON_CHAIN });
    }
}
