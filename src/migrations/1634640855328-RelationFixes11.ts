import {MigrationInterface, QueryRunner} from "typeorm";

export class RelationFixes111634640855328 implements MigrationInterface {
    name = 'RelationFixes111634640855328'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tatum_account" DROP COLUMN "accountingCurrency"`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD "memo" character varying`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD "message" character varying`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD "destinationTag" integer`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD CONSTRAINT "FK_49a94263eaae183abe64b42b8a4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tatum_account" DROP CONSTRAINT "FK_49a94263eaae183abe64b42b8a4"`);
        await queryRunner.query(`ALTER TABLE "tatum_account" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "tatum_account" DROP COLUMN "destinationTag"`);
        await queryRunner.query(`ALTER TABLE "tatum_account" DROP COLUMN "message"`);
        await queryRunner.query(`ALTER TABLE "tatum_account" DROP COLUMN "memo"`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD "accountingCurrency" character varying NOT NULL`);
    }

}
