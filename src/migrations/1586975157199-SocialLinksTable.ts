import {MigrationInterface, QueryRunner} from "typeorm";

export class SocialLinksTable1586975157199 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "social_link" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying NOT NULL, "apiKey" character varying, "apiSecret" character varying, "userId" character varying, CONSTRAINT "PK_51b2adcc50ae969ba051eacd714" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD CONSTRAINT "FK_d8a1d8b8a8235632f9011346197" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "social_link" DROP CONSTRAINT "FK_d8a1d8b8a8235632f9011346197"`);
        await queryRunner.query(`DROP TABLE "social_link"`);
    }

}
