import { MigrationInterface, QueryRunner } from "typeorm";

export class ethWithdraw1600973515389 implements MigrationInterface {
    name = "ethWithdraw1600973515389";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" ADD "ethAddress" character varying`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "transactionHash" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "transactionHash"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "ethAddress"`);
    }
}
