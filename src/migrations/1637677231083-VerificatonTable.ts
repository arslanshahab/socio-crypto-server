import { MigrationInterface, QueryRunner } from "typeorm";

export class VerificatonTable1637677231083 implements MigrationInterface {
    name = "VerificatonTable1637677231083";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "verification" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying NOT NULL, "verified" boolean DEFAULT false, "token" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_f7e3a90ca384e71d6e2e93bb340" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "verification" ADD CONSTRAINT "FK_8300048608d8721aea27747b07a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification" DROP CONSTRAINT "FK_8300048608d8721aea27747b07a"`);
        await queryRunner.query(`DROP TABLE "verification"`);
    }
}
