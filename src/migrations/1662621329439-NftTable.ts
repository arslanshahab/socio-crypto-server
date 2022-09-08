import {MigrationInterface, QueryRunner} from "typeorm";

export class NftTable1662621329439 implements MigrationInterface {
    name = 'NftTable1662621329439'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "nft" ("nftId" character varying NOT NULL, "type" character varying NOT NULL, "name" character varying NOT NULL, "transactions" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "UQ_1156642d40093c2cf27efc405a5" UNIQUE ("nftId"), CONSTRAINT "UQ_fbf824aa02944ec173092a028f1" UNIQUE ("transactions"), CONSTRAINT "PK_1156642d40093c2cf27efc405a5" PRIMARY KEY ("nftId"))`);
        await queryRunner.query(`ALTER TABLE "nft" ADD CONSTRAINT "FK_2d4535b902eed75d0deb2d515be" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nft" DROP CONSTRAINT "FK_2d4535b902eed75d0deb2d515be"`);
        await queryRunner.query(`DROP TABLE "nft"`);
    }

}
