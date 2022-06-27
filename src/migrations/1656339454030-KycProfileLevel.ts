import {MigrationInterface, QueryRunner} from "typeorm";

export class KycProfileLevel1656339454030 implements MigrationInterface {
    name = 'KycProfileLevel1656339454030'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "verification_application_level_enum" AS ENUM('LEVEL1', 'LEVEL2')`);
        await queryRunner.query(`ALTER TABLE "verification_application" ADD "level" "verification_application_level_enum" NOT NULL DEFAULT 'LEVEL1'`);
        await queryRunner.query(`ALTER TABLE "verification_application" ADD "profile" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification_application" DROP COLUMN "profile"`);
        await queryRunner.query(`ALTER TABLE "verification_application" DROP COLUMN "level"`);
        await queryRunner.query(`DROP TYPE "verification_application_level_enum"`);
    }

}
