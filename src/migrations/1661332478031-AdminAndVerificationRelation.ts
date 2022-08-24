import {MigrationInterface, QueryRunner} from "typeorm";

export class AdminAndVerificationRelation1661332478031 implements MigrationInterface {
    name = 'AdminAndVerificationRelation1661332478031'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification_application" ADD "adminId" uuid`);
        await queryRunner.query(`ALTER TABLE "verification_application" ADD CONSTRAINT "FK_0f5953ed6d6b75ee724463f051d" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification_application" DROP CONSTRAINT "FK_0f5953ed6d6b75ee724463f051d"`);
        await queryRunner.query(`ALTER TABLE "verification_application" DROP COLUMN "adminId"`);
    }

}
