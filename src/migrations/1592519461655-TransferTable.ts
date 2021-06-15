import { MigrationInterface, QueryRunner } from "typeorm";

export class TransferTable1592519461655 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "transfer" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "amount" double precision NOT NULL, "action" character varying NOT NULL, "withdrawStatus" character varying, "campaignId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "walletId" uuid, CONSTRAINT "PK_fd9ddbdd49a17afcbe014401295" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "transfer" ADD CONSTRAINT "FK_011b4b0e8490d5434857bd40efa" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_011b4b0e8490d5434857bd40efa"`);
        await queryRunner.query(`DROP TABLE "transfer"`);
    }
}
