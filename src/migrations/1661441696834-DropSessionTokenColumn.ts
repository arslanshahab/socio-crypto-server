import {MigrationInterface, QueryRunner} from "typeorm";

export class DropSessionTokenColumn1661441696834 implements MigrationInterface {
    name = 'DropSessionTokenColumn1661441696834'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "token"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" ADD "token" character varying NOT NULL`);
    }

}
