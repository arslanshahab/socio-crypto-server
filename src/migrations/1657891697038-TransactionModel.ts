import {MigrationInterface, QueryRunner} from "typeorm";

export class TransactionModel1657891697038 implements MigrationInterface {
    name = 'TransactionModel1657891697038'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transaction" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tag" character varying NOT NULL, "chain" character varying NOT NULL, "action" character varying, "socialType" character varying NOT NULL, "transactionType" character varying NOT NULL, "participantId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_89eadb93a89810556e1cbcd6ab9" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "transaction"`);
    }

}
