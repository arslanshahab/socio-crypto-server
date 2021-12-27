import { MigrationInterface, QueryRunner } from "typeorm";

export class AuthenticationChanges1640353892412 implements MigrationInterface {
    name = "AuthenticationChanges1640353892412";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification" DROP CONSTRAINT "FK_8300048608d8721aea27747b07a"`);
        await queryRunner.query(`ALTER TABLE "verification" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "verification" DROP COLUMN "token"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "email" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "user" ADD "password" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "verification" ADD "code" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "identityId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "verification" ALTER COLUMN "verified" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification" ALTER COLUMN "verified" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "identityId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "verification" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "verification" ADD "token" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "verification" ADD "userId" uuid`);
        await queryRunner.query(
            `ALTER TABLE "verification" ADD CONSTRAINT "FK_8300048608d8721aea27747b07a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
