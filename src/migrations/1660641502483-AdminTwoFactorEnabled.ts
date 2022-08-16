import {MigrationInterface, QueryRunner} from "typeorm";

export class AdminTwoFactorEnabled1660641502483 implements MigrationInterface {
    name = 'AdminTwoFactorEnabled1660641502483'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin" ADD "twoFactorEnabled" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "twoFactorEnabled"`);
    }

}
