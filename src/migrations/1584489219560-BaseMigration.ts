import { MigrationInterface, QueryRunner } from "typeorm";

export class BaseMigration1584489219560 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "user" ("id" character varying NOT NULL, "email" character varying NOT NULL, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE TABLE "participant" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "clickCount" integer NOT NULL DEFAULT 0, "userId" character varying NOT NULL, "campaignId" character varying NOT NULL, CONSTRAINT "PK_b22a56c2e60aa49dd92b7cd839b" PRIMARY KEY ("id", "userId", "campaignId"))`
        );
        await queryRunner.query(
            `CREATE TABLE "campaign" ("id" character varying NOT NULL, "beginDate" TIMESTAMP WITH TIME ZONE, "endDate" TIMESTAMP WITH TIME ZONE, "coiinTotal" numeric NOT NULL, "target" character varying NOT NULL, "description" character varying DEFAULT '', CONSTRAINT "PK_0ce34d26e7f2eb316a3a592cdc4" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "participant" ADD CONSTRAINT "FK_b915e97dea27ffd1e40c8003b3b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "participant" ADD CONSTRAINT "FK_1835802549e230f6cd88c6efef9" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `CREATE TABLE "query-result-cache" ("id" SERIAL NOT NULL, "identifier" character varying, "time" bigint NOT NULL, "duration" integer NOT NULL, "query" text NOT NULL, "result" text NOT NULL, CONSTRAINT "PK_6a98f758d8bfd010e7e10ffd3d3" PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "query-result-cache"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_1835802549e230f6cd88c6efef9"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_b915e97dea27ffd1e40c8003b3b"`);
        await queryRunner.query(`DROP TABLE "campaign"`);
        await queryRunner.query(`DROP TABLE "participant"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }
}
