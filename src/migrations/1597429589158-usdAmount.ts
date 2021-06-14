import { MigrationInterface, QueryRunner } from "typeorm";

export class usdAmount1597429589158 implements MigrationInterface {
    name = "usdAmount1597429589158";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" ADD "usdAmount" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "usdAmount"`);
    }
}
