import {MigrationInterface, QueryRunner} from "typeorm";

export class RaffleCampaign1607969255466 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "raffle_prize" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "displayName" character varying NOT NULL, "image" boolean, "affiliateLink" character varying, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "campaignId" uuid, CONSTRAINT "REL_29f131f37d9cbb4814b2b6d306" UNIQUE ("campaignId"), CONSTRAINT "PK_d209918db84713ab8aec65ccec7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "rafflePrizeId" uuid`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "type" text`);
        await queryRunner.query(`ALTER TABLE "raffle_prize" ADD CONSTRAINT "FK_29f131f37d9cbb4814b2b6d3069" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD CONSTRAINT "FK_f6c593d6013276bc80450c7638e" FOREIGN KEY ("rafflePrizeId") REFERENCES "raffle_prize"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`UPDATE "campaign" SET "type" = 'coiin' WHERE "id" IN (select "id" FROM "campaign")`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_f6c593d6013276bc80450c7638e"`);
        await queryRunner.query(`ALTER TABLE "raffle_prize" DROP CONSTRAINT "FK_29f131f37d9cbb4814b2b6d3069"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "rafflePrizeId"`);
        await queryRunner.query(`DROP TABLE "raffle_prize"`);
    }

}
