import {MigrationInterface, QueryRunner} from "typeorm";

export class KycLevel1656329804121 implements MigrationInterface {
    name = 'KycLevel1656329804121'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "verification_application_level_enum" AS ENUM('1', '2')`);
        await queryRunner.query(`ALTER TABLE "verification_application" ADD "level" "verification_application_level_enum" NOT NULL DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification_application" DROP COLUMN "level"`);
        await queryRunner.query(`DROP TYPE "verification_application_level_enum"`);
    }

}
