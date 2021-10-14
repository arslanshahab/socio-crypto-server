import {MigrationInterface, QueryRunner} from "typeorm";

export class FixEverything1634237549795 implements MigrationInterface {
    name = 'FixEverything1634237549795'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tatum_wallet" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "currency" character varying NOT NULL, "enabled" boolean NOT NULL, "xpub" character varying NOT NULL, "address" character varying NOT NULL, "owner" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7ea26f9bf3a0f53ce5802ac46cf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "sharedMediaFormat"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "sharedMedia"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "reward"`);
        await queryRunner.query(`ALTER TABLE "weekly_reward" DROP COLUMN "participantId"`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD "address" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD "orgId" uuid`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ALTER COLUMN "channel" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ALTER COLUMN "media" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ALTER COLUMN "mediaFormat" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ALTER COLUMN "isDefault" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ALTER COLUMN "campaignId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_template" ALTER COLUMN "channel" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_template" ALTER COLUMN "post" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_template" ALTER COLUMN "campaignId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "instructions" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "socialMediaType" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "weekly_reward" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD CONSTRAINT "FK_387a88154f11ef01474ee2b5672" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ADD CONSTRAINT "FK_b845045382e55918752955d23cb" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign_template" ADD CONSTRAINT "FK_19b3f8a418cf4753d5df4291099" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "weekly_reward" ADD CONSTRAINT "FK_ba2529b7af668bbc111475272b1" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "weekly_reward" DROP CONSTRAINT "FK_ba2529b7af668bbc111475272b1"`);
        await queryRunner.query(`ALTER TABLE "campaign_template" DROP CONSTRAINT "FK_19b3f8a418cf4753d5df4291099"`);
        await queryRunner.query(`ALTER TABLE "campaign_media" DROP CONSTRAINT "FK_b845045382e55918752955d23cb"`);
        await queryRunner.query(`ALTER TABLE "tatum_account" DROP CONSTRAINT "FK_387a88154f11ef01474ee2b5672"`);
        await queryRunner.query(`ALTER TABLE "weekly_reward" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "socialMediaType" SET DEFAULT ARRAY[]`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "instructions" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "campaign_template" ALTER COLUMN "campaignId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_template" ALTER COLUMN "post" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_template" ALTER COLUMN "channel" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ALTER COLUMN "campaignId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ALTER COLUMN "isDefault" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ALTER COLUMN "mediaFormat" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ALTER COLUMN "media" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ALTER COLUMN "channel" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tatum_account" DROP COLUMN "orgId"`);
        await queryRunner.query(`ALTER TABLE "tatum_account" DROP COLUMN "address"`);
        await queryRunner.query(`ALTER TABLE "weekly_reward" ADD "participantId" uuid`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "reward" uuid`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "sharedMedia" character varying`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "sharedMediaFormat" character varying`);
        await queryRunner.query(`DROP TABLE "tatum_wallet"`);
    }

}
