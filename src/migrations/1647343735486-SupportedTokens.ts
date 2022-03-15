import { MigrationInterface, QueryRunner } from "typeorm";

export class SupportedTokens1647343735486 implements MigrationInterface {
    name = "SupportedTokens1647343735486";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "token" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "symbol" character varying NOT NULL, "network" character varying NOT NULL, "contractAddress" character varying, "enabled" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_82fae97f905930df5d62a702fc9" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`ALTER TABLE "currency" ADD "tokenId" uuid`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "currencyId" uuid`);
        await queryRunner.query(
            `ALTER TABLE "currency" ADD CONSTRAINT "FK_d1e8baad49c6c5514b6a0dcba26" FOREIGN KEY ("tokenId") REFERENCES "token"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "campaign" ADD CONSTRAINT "FK_94f38926b8f74ecd88ecf6ba8c8" FOREIGN KEY ("currencyId") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP CONSTRAINT "FK_94f38926b8f74ecd88ecf6ba8c8"`);
        await queryRunner.query(`ALTER TABLE "currency" DROP CONSTRAINT "FK_d1e8baad49c6c5514b6a0dcba26"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "currencyId"`);
        await queryRunner.query(`ALTER TABLE "currency" DROP COLUMN "tokenId"`);
        await queryRunner.query(`DROP TABLE "token"`);
    }
}
