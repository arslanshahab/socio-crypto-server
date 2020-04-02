import {MigrationInterface, QueryRunner} from "typeorm";

export class ExtendActions1585851953206 implements MigrationInterface {
    name = 'ExtendActions1585851953206'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant" ADD "viewCount" integer NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "participant" ADD "submissionCount" integer NOT NULL DEFAULT 0`, undefined);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "totalParticipationScore" numeric NOT NULL DEFAULT 0`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "totalParticipationScore"`, undefined);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "submissionCount"`, undefined);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "viewCount"`, undefined);
    }

}
