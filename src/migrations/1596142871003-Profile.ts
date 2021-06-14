import { MigrationInterface, QueryRunner } from "typeorm";

export class Profile1596142871003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "profile" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "username" character varying NOT NULL, "recoveryCode" character varying, "deviceToken" character varying, "email" character varying, "ageRange" text, "city" text, "state" text, "interests" text NOT NULL DEFAULT '[]', "values" text NOT NULL DEFAULT '[]', "platforms" text NOT NULL DEFAULT '[]', "userId" uuid, CONSTRAINT "UQ_d80b94dc62f7467403009d88062" UNIQUE ("username"), CONSTRAINT "REL_a24972ebd73b106250713dcddd" UNIQUE ("userId"), CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `INSERT INTO "profile" ("userId", "username", "recoveryCode", "deviceToken", "email") SELECT "user"."id" AS "userId", "user"."username" AS "username", "user"."recoveryCode" AS "recoveryCode", "user"."deviceToken" AS "deviceToken", "user"."email" AS "email" FROM "user"`
        );

        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "username"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "deviceToken"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "recoveryCode"`);
        await queryRunner.query(
            `ALTER TABLE "profile" ADD CONSTRAINT "FK_a24972ebd73b106250713dcddd9" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "profile" DROP CONSTRAINT "FK_a24972ebd73b106250713dcddd9"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "recoveryCode" character varying`);
        await queryRunner.query(`ALTER TABLE "user" ADD "deviceToken" character varying`);
        await queryRunner.query(`ALTER TABLE "user" ADD "username" character varying NOT NULL`);
        await queryRunner.query(
            `ALTER TABLE "user" ADD CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username")`
        );
        await queryRunner.query(`ALTER TABLE "user" ADD "email" character varying`);
        await queryRunner.query(`DROP TABLE "profile"`);
    }
}
