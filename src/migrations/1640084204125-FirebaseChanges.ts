import { MigrationInterface, QueryRunner } from "typeorm";

export class FirebaseChanges1640084204125 implements MigrationInterface {
    name = "FirebaseChanges1640084204125";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification" DROP CONSTRAINT "FK_8300048608d8721aea27747b07a"`);
        await queryRunner.query(`ALTER TABLE "verification" RENAME COLUMN "userId" TO "type"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "firebaseId" character varying`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "identityId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "verification" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "verification" ADD "type" character varying NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "verification" ADD "type" uuid`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "identityId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "firebaseId"`);
        await queryRunner.query(`ALTER TABLE "verification" RENAME COLUMN "type" TO "userId"`);
        await queryRunner.query(
            `ALTER TABLE "verification" ADD CONSTRAINT "FK_8300048608d8721aea27747b07a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
