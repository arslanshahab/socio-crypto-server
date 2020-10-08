import {MigrationInterface, QueryRunner} from "typeorm";

export class ExternalWalletTable1601574005349 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "external_wallet" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "ethereumAddress" character varying NOT NULL, "claimed" boolean NOT NULL DEFAULT false, "claimMessage" character varying NOT NULL, "balance" character varying NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "UQ_4493ccb3fc989cdb2e318a81afb" UNIQUE ("ethereumAddress"), CONSTRAINT "PK_116395b341d18fc5cb46d6de4f6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "external_wallet" ADD CONSTRAINT "FK_a4f3bbd0da712db47bd85ce3c5e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "external_wallet" DROP CONSTRAINT "FK_a4f3bbd0da712db47bd85ce3c5e"`);
        await queryRunner.query(`DROP TABLE "external_wallet"`);
    }

}
