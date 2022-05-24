import { MigrationInterface, QueryRunner } from "typeorm";

export class UserDeletedAtColumn1653307865392 implements MigrationInterface {
    name = "UserDeletedAtColumn1653307865392";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profile" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "user" ADD "deletedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "deletedAt"`);
    }
}
