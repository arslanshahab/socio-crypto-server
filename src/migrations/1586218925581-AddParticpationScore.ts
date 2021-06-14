import { MigrationInterface, QueryRunner } from "typeorm";

export class AddParticpationScore1586218925581 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant" ADD "participationScore" bigint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "participationScore"`);
    }
}
