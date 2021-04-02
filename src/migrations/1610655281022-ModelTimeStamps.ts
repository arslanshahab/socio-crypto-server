import {MigrationInterface, QueryRunner} from "typeorm";

export class ModelTimeStamps1610655281022 implements MigrationInterface {
    name = 'ModelTimeStamps1610655281022'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallet_currency" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "wallet_currency" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "escrow" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "escrow" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "crypto_transaction" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "crypto_transaction" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "crypto_currency" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "crypto_currency" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "quality_score" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "quality_score" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quality_score" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "quality_score" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "crypto_currency" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "crypto_currency" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "crypto_transaction" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "crypto_transaction" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "escrow" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "escrow" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "wallet_currency" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "wallet_currency" DROP COLUMN "createdAt"`);
    }

}
