import {MigrationInterface, QueryRunner} from "typeorm";

export class ActiveUser1590188718562 implements MigrationInterface {
    name = 'ActiveUser1590188718562'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "active" boolean NOT NULL DEFAULT true`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "active"`, undefined);
    }

}
