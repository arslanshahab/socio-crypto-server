import { MigrationInterface, QueryRunner } from "typeorm";

export class BlackListParticipant1656589679359 implements MigrationInterface {
    name = "BlackListParticipant1656589679359";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant" ADD "blacklist" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "participant" DROP COLUMN "blacklist"`);
    }
}
