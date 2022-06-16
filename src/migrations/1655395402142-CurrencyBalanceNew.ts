import {MigrationInterface, QueryRunner} from "typeorm";

export class CurrencyBalanceNew1655395402142 implements MigrationInterface {
    name = 'CurrencyBalanceNew1655395402142'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tatum_wallet" DROP COLUMN "enabled"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "payoutId"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "payoutStatus"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "network"`);
        await queryRunner.query(`ALTER TABLE "currency" ADD "accountBalance" double precision DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "currency" ADD "availableBalance" double precision DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "type" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "currency" DROP COLUMN "availableBalance"`);
        await queryRunner.query(`ALTER TABLE "currency" DROP COLUMN "accountBalance"`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "network" character varying`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "payoutStatus" character varying`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "payoutId" character varying`);
        await queryRunner.query(`ALTER TABLE "tatum_wallet" ADD "enabled" boolean NOT NULL`);
    }

}
