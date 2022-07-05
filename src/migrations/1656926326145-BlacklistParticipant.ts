import { MigrationInterface, QueryRunner } from "typeorm";

export class BlacklistParticipant1656926326145 implements MigrationInterface {
    name = "BlacklistParticipant1656926326145";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant" ADD "blacklist" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "blacklist"`);
    }
}
