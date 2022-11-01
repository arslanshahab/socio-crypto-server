import {MigrationInterface, QueryRunner} from "typeorm";

export class MyfiiFactorModel1667309145495 implements MigrationInterface {
    name = 'MyfiiFactorModel1667309145495'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "factor" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying, "type" character varying NOT NULL, "value" character varying NOT NULL, "provider" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_474c0e9d4ca1c181f178952187d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "nft" ADD CONSTRAINT "UQ_1156642d40093c2cf27efc405a5" UNIQUE ("nftId")`);
        await queryRunner.query(`ALTER TABLE "factor" ADD CONSTRAINT "FK_aaed59026eead2ed464fa1b92b8" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "factor" DROP CONSTRAINT "FK_aaed59026eead2ed464fa1b92b8"`);
        await queryRunner.query(`ALTER TABLE "nft" DROP CONSTRAINT "UQ_1156642d40093c2cf27efc405a5"`);
        await queryRunner.query(`DROP TABLE "factor"`);
    }

}
