import { MigrationInterface, QueryRunner } from "typeorm";

export class UserKycRelationChanges1648112633751 implements MigrationInterface {
    name = "UserKycRelationChanges1648112633751";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification_application" ADD "reason" character varying`);
        await queryRunner.query(
            `ALTER TABLE "verification_application" DROP CONSTRAINT "FK_79e9b3d653b00690eae5f235dad"`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" ADD CONSTRAINT "UQ_79e9b3d653b00690eae5f235dad" UNIQUE ("userId")`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" ADD CONSTRAINT "FK_79e9b3d653b00690eae5f235dad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "verification_application" DROP CONSTRAINT "FK_79e9b3d653b00690eae5f235dad"`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" DROP CONSTRAINT "UQ_79e9b3d653b00690eae5f235dad"`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" ADD CONSTRAINT "FK_79e9b3d653b00690eae5f235dad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(`ALTER TABLE "verification_application" DROP COLUMN "reason"`);
    }
}
