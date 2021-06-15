import { MigrationInterface, QueryRunner } from "typeorm";

export class RecoveryCode1592933681529 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" ADD "recoveryCode" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "recoveryCode"`);
    }
}
