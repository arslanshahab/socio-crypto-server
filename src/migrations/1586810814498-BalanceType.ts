import { MigrationInterface, QueryRunner } from "typeorm";

export class BalanceType1586810814498 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "balance"`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD "balance" double precision NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "balance"`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD "balance" integer NOT NULL DEFAULT 0`);
    }
}
