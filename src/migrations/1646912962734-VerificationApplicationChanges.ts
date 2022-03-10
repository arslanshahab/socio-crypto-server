import { MigrationInterface, QueryRunner } from "typeorm";

export class VerificationApplicationChanges1646912962734 implements MigrationInterface {
    name = "VerificationApplicationChanges1646912962734";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "verification_application" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification_application" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "verification_application" DROP COLUMN "createdAt"`);
    }
}
