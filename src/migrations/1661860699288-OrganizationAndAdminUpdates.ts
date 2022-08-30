import {MigrationInterface, QueryRunner} from "typeorm";

export class OrganizationAndAdminUpdates1661860699288 implements MigrationInterface {
    name = 'OrganizationAndAdminUpdates1661860699288'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification_application" ADD "adminId" uuid`);
        await queryRunner.query(`ALTER TABLE "org" ADD "logo" character varying`);
        await queryRunner.query(`ALTER TABLE "admin" ADD "twoFactorEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "verification_application" ADD CONSTRAINT "FK_0f5953ed6d6b75ee724463f051d" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification_application" DROP CONSTRAINT "FK_0f5953ed6d6b75ee724463f051d"`);
        await queryRunner.query(`ALTER TABLE "admin" DROP COLUMN "twoFactorEnabled"`);
        await queryRunner.query(`ALTER TABLE "org" DROP COLUMN "logo"`);
        await queryRunner.query(`ALTER TABLE "verification_application" DROP COLUMN "adminId"`);
    }

}
