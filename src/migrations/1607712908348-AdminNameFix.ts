import {MigrationInterface, QueryRunner} from "typeorm";

export class AdminNameFix1607712908348 implements MigrationInterface {
    name = 'AdminNameFix1607712908348'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin" ALTER COLUMN "name" SET DEFAULT 'raiinmaker'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin" ALTER COLUMN "name" DROP DEFAULT`);
    }

}
