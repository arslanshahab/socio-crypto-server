import { MigrationInterface, QueryRunner } from "typeorm";

export class AdminName1607642320956 implements MigrationInterface {
    name = "AdminName1607642320956";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin" ADD "name" character varying NOT NULL DEFAULT 'raiinmaker'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "name"`);
    }
}
