import {MigrationInterface, QueryRunner} from "typeorm";

export class Float8ToVarChar1594237602479 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant" ALTER COLUMN "clickCount" TYPE VARCHAR`);
        await queryRunner.query(`ALTER TABLE "participant" ALTER COLUMN "viewCount" TYPE VARCHAR`);
        await queryRunner.query(`ALTER TABLE "participant" ALTER COLUMN "submissionCount" TYPE VARCHAR`);
        await queryRunner.query(`ALTER TABLE "participant" ALTER COLUMN "participationScore" TYPE VARCHAR`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "totalParticipationScore" TYPE VARCHAR`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "coiinTotal" TYPE VARCHAR`);
        await queryRunner.query(`ALTER TABLE "wallet" ALTER COLUMN "balance" TYPE VARCHAR`);
        await queryRunner.query(`ALTER TABLE "transfer" ALTER COLUMN "amount" TYPE VARCHAR`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" ALTER COLUMN "score" TYPE VARCHAR`);
        await queryRunner.query(`ALTER TABLE "social_post" ALTER COLUMN "likes" TYPE VARCHAR`);
        await queryRunner.query(`ALTER TABLE "social_post" ALTER COLUMN "shares" TYPE VARCHAR`);
        await queryRunner.query(`ALTER TABLE "social_post" ALTER COLUMN "comments" TYPE VARCHAR`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant" ALTER COLUMN "clickCount" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "participant" ALTER COLUMN "viewCount" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "participant" ALTER COLUMN "submissionCount" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "participant" ALTER COLUMN "participationScore" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "totalParticipationScore" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "coiinTotal" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "wallet" ALTER COLUMN "balance" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "transfer" ALTER COLUMN "amount" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" ALTER COLUMN "score" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "social_post" ALTER COLUMN "likes" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "social_post" ALTER COLUMN "shares" TYPE bigint`);
        await queryRunner.query(`ALTER TABLE "social_post" ALTER COLUMN "comments" TYPE bigint`);
    }

}
