import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatedUpdatedColumns1592325981780 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "wallet" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "factor_link" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "factor_link" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "user" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "factor_link" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "factor_link" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "createdAt"`);
    }
}
