import {MigrationInterface, QueryRunner} from "typeorm";

export class Float8ToVarChar1594237602479 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "social_post" DROP COLUMN "likes"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD "likes" character varying NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP COLUMN "shares"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD "shares" character varying NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP COLUMN "comments"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD "comments" character varying NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" DROP COLUMN "score"`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" ADD "score" character varying NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "clickCount"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "clickCount" character varying NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "viewCount"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "viewCount" character varying NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "submissionCount"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "submissionCount" character varying NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "participationScore"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "participationScore" character varying NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "coiinTotal"`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "coiinTotal" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "totalParticipationScore"`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "totalParticipationScore" character varying NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "totalParticipationScore"`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "totalParticipationScore" bigint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "coiinTotal"`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "coiinTotal" numeric NOT NULL`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "participationScore"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "participationScore" bigint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "submissionCount"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "submissionCount" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "viewCount"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "viewCount" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "clickCount"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "clickCount" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" DROP COLUMN "score"`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" ADD "score" bigint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP COLUMN "comments"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD "comments" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP COLUMN "shares"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD "shares" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP COLUMN "likes"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD "likes" integer NOT NULL DEFAULT 0`);
    }

}
