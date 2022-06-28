import {MigrationInterface, QueryRunner} from "typeorm";

export class KycProfileLevel1656412281850 implements MigrationInterface {
    name = 'KycProfileLevel1656412281850'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "verification_application_level_enum" AS ENUM('LEVEL1', 'LEVEL2')`);
        await queryRunner.query(`ALTER TABLE "verification_application" ADD "level" "verification_application_level_enum" NOT NULL DEFAULT 'LEVEL1'`);
        await queryRunner.query(`ALTER TABLE "verification_application" ADD "profile" character varying`);
        await queryRunner.query(`ALTER TABLE "verification_application" DROP CONSTRAINT "FK_79e9b3d653b00690eae5f235dad"`);
        await queryRunner.query(`ALTER TABLE "verification_application" DROP CONSTRAINT "UQ_79e9b3d653b00690eae5f235dad"`);
        await queryRunner.query(`ALTER TABLE "verification_application" ADD CONSTRAINT "FK_79e9b3d653b00690eae5f235dad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification_application" DROP CONSTRAINT "FK_79e9b3d653b00690eae5f235dad"`);
        await queryRunner.query(`ALTER TABLE "verification_application" ADD CONSTRAINT "UQ_79e9b3d653b00690eae5f235dad" UNIQUE ("userId")`);
        await queryRunner.query(`ALTER TABLE "verification_application" ADD CONSTRAINT "FK_79e9b3d653b00690eae5f235dad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "verification_application" DROP COLUMN "profile"`);
        await queryRunner.query(`ALTER TABLE "verification_application" DROP COLUMN "level"`);
        await queryRunner.query(`DROP TYPE "verification_application_level_enum"`);
    }

}
