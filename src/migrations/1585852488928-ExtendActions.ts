import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendActions1585852488928 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant" ADD "viewCount" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "submissionCount" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "totalParticipationScore" bigint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "totalParticipationScore"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "submissionCount"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "viewCount"`);
    }
}
