import { MigrationInterface, QueryRunner } from "typeorm";

export class AuthenticationChanges31640353152877 implements MigrationInterface {
    name = "AuthenticationChanges31640353152877";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification" ALTER COLUMN "code" SET DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification" ALTER COLUMN "code" DROP DEFAULT`);
    }
}
