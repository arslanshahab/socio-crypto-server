import { MigrationInterface, QueryRunner } from "typeorm";

export class NewChanges1639694248804 implements MigrationInterface {
    name = "NewChanges1639694248804";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "kycStatus" SET DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "kycStatus" DROP DEFAULT`);
    }
}
