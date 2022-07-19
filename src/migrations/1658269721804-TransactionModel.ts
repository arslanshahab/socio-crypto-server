import {MigrationInterface, QueryRunner} from "typeorm";

export class TransactionModel1658269721804 implements MigrationInterface {
    name = 'TransactionModel1658269721804'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transaction" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tag" character varying NOT NULL, "txId" character varying NOT NULL, "chain" character varying NOT NULL, "action" character varying, "socialType" character varying, "transactionType" character varying NOT NULL, "participantId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "campaignId" uuid NOT NULL, CONSTRAINT "PK_d33d9a2702e90041f22105b7732" PRIMARY KEY ("id", "campaignId"))`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "FK_3f3891eefaf8dcce48eae8c709f" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_3f3891eefaf8dcce48eae8c709f"`);
        await queryRunner.query(`DROP TABLE "transaction"`);
    }

}
