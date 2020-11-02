import {MigrationInterface, QueryRunner} from "typeorm";

export class adminPortal1603224050346 implements MigrationInterface {
    name = 'adminPortal1603224050346'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "hourly_campaign_metric" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "postCount" character varying NOT NULL DEFAULT 0, "participantCount" character varying NOT NULL DEFAULT 0, "clickCount" character varying NOT NULL DEFAULT 0, "viewCount" character varying NOT NULL DEFAULT 0, "submissionCount" character varying NOT NULL DEFAULT 0, "likeCount" character varying NOT NULL DEFAULT 0, "shareCount" character varying NOT NULL DEFAULT 0, "commentCount" character varying NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "campaignId" uuid, "orgId" uuid, CONSTRAINT "PK_34a4c0755a2c03c4659f5d0174f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "org" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_703783130f152a752cadf7aa751" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "admin" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "firebaseId" character varying NOT NULL, "userId" uuid, "orgId" uuid, CONSTRAINT "PK_e032310bcef831fb83101899b10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "orgId" uuid`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "orgId" uuid`);
        await queryRunner.query(`ALTER TABLE "hourly_campaign_metric" ADD CONSTRAINT "FK_0a14e4214cbadbbf5ab94dfeeb0" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hourly_campaign_metric" ADD CONSTRAINT "FK_65dc03b9a87221a49c0584227ea" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD CONSTRAINT "FK_69167255fc368a59063ebd8cf16" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD CONSTRAINT "FK_f1ade2ad37c88435b086c97cfc8" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "admin" ADD CONSTRAINT "FK_f8a889c4362d78f056960ca6dad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "admin" ADD CONSTRAINT "FK_6d94bbdb1be6d107f3d971fc808" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin" DROP CONSTRAINT "FK_6d94bbdb1be6d107f3d971fc808"`);
        await queryRunner.query(`ALTER TABLE "admin" DROP CONSTRAINT "FK_f8a889c4362d78f056960ca6dad"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP CONSTRAINT "FK_f1ade2ad37c88435b086c97cfc8"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_69167255fc368a59063ebd8cf16"`);
        await queryRunner.query(`ALTER TABLE "hourly_campaign_metric" DROP CONSTRAINT "FK_65dc03b9a87221a49c0584227ea"`);
        await queryRunner.query(`ALTER TABLE "hourly_campaign_metric" DROP CONSTRAINT "FK_0a14e4214cbadbbf5ab94dfeeb0"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "orgId"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "orgId"`);
        await queryRunner.query(`DROP TABLE "admin"`);
        await queryRunner.query(`DROP TABLE "org"`);
        await queryRunner.query(`DROP TABLE "hourly_campaign_metric"`);
    }

}
