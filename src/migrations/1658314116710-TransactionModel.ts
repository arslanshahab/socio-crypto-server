import {MigrationInterface, QueryRunner} from "typeorm";

export class TransactionModel1658314116710 implements MigrationInterface {
    name = 'TransactionModel1658314116710'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transaction" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tag" character varying NOT NULL, "txId" character varying NOT NULL, "chain" character varying NOT NULL, "action" character varying, "socialType" character varying, "transactionType" character varying NOT NULL, "participantId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "campaignId" uuid, CONSTRAINT "PK_89eadb93a89810556e1cbcd6ab9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "FK_3f3891eefaf8dcce48eae8c709f" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_3f3891eefaf8dcce48eae8c709f"`);
        await queryRunner.query(`DROP TABLE "transaction"`);
    }

}
