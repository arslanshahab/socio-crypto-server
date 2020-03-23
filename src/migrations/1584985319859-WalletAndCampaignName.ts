import {MigrationInterface, QueryRunner} from "typeorm";

export class WalletAndCampaignName1584985319859 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "wallet" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "balance" integer NOT NULL DEFAULT 0, "userId" character varying, CONSTRAINT "REL_35472b1fe48b6330cd34970956" UNIQUE ("userId"), CONSTRAINT "PK_bec464dd8d54c39c54fd32e2334" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_1835802549e230f6cd88c6efef9"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "PK_b22a56c2e60aa49dd92b7cd839b"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "PK_084d2d56c49133d78f4de0054c3" PRIMARY KEY ("id", "userId")`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "campaignId"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "campaignId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "PK_084d2d56c49133d78f4de0054c3"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "PK_b22a56c2e60aa49dd92b7cd839b" PRIMARY KEY ("id", "userId", "campaignId")`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP CONSTRAINT "PK_0ce34d26e7f2eb316a3a592cdc4"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "id" uuid NOT NULL DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD CONSTRAINT "PK_0ce34d26e7f2eb316a3a592cdc4" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD CONSTRAINT "FK_35472b1fe48b6330cd349709564" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "FK_1835802549e230f6cd88c6efef9" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`INSERT INTO "wallet" ("userId", "balance") SELECT "user"."id" as "userId", 0 as "balance" FROM "user"`)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_1835802549e230f6cd88c6efef9"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_35472b1fe48b6330cd349709564"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP CONSTRAINT "PK_0ce34d26e7f2eb316a3a592cdc4"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD CONSTRAINT "PK_0ce34d26e7f2eb316a3a592cdc4" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "PK_b22a56c2e60aa49dd92b7cd839b"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "PK_084d2d56c49133d78f4de0054c3" PRIMARY KEY ("id", "userId")`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "campaignId"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "campaignId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "PK_084d2d56c49133d78f4de0054c3"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "PK_b22a56c2e60aa49dd92b7cd839b" PRIMARY KEY ("id", "userId", "campaignId")`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "FK_1835802549e230f6cd88c6efef9" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "name"`);
        await queryRunner.query(`DROP TABLE "wallet"`);
    }

}
