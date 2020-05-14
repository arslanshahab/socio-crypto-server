import {MigrationInterface, QueryRunner} from "typeorm";

export class FactorUser1589473724994 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" ADD "primaryFactorId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ADD "primaryFactorType" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "username" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "username" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "primaryFactorType"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "primaryFactorId"`);
    }

}
