import { MigrationInterface, QueryRunner } from "typeorm";

export class MarketData1654519687525 implements MigrationInterface {
    name = "MarketData1654519687525";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "market_data" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "symbol" character varying NOT NULL, "price" double precision NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f66c35bec52b05f6eae861225e6" PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "market_data"`);
    }
}
