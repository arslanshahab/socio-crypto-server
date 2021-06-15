import { MigrationInterface, QueryRunner } from "typeorm";

export class FundingWallet1604605170686 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "external_address" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "ethereumAddress" character varying NOT NULL, "claimed" boolean NOT NULL DEFAULT false, "claimMessage" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "fundingWalletId" uuid, "userId" uuid, CONSTRAINT "UQ_f725434929b77da9f8e1aeb9c42" UNIQUE ("ethereumAddress"), CONSTRAINT "PK_23160bcba1fe6e3e4fe67af66b3" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE TABLE "funding_wallet" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "balance" character varying NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" uuid, CONSTRAINT "REL_505179943e36195706a3c1cba2" UNIQUE ("orgId"), CONSTRAINT "PK_4182c40a608683810fb10c1fdf4" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`ALTER TABLE "transfer" ADD "fundingWalletId" uuid`);
        await queryRunner.query(
            `ALTER TABLE "external_address" ADD CONSTRAINT "FK_d288b9c0ec91db01f0285a2a985" FOREIGN KEY ("fundingWalletId") REFERENCES "funding_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "external_address" ADD CONSTRAINT "FK_f362b520f3de71dd59b128fea4e" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "funding_wallet" ADD CONSTRAINT "FK_505179943e36195706a3c1cba2b" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "transfer" ADD CONSTRAINT "FK_584f181d9d102bb8ac5b02bf343" FOREIGN KEY ("fundingWalletId") REFERENCES "funding_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_584f181d9d102bb8ac5b02bf343"`);
        await queryRunner.query(`ALTER TABLE "funding_wallet" DROP CONSTRAINT "FK_505179943e36195706a3c1cba2b"`);
        await queryRunner.query(`ALTER TABLE "external_address" DROP CONSTRAINT "FK_f362b520f3de71dd59b128fea4e"`);
        await queryRunner.query(`ALTER TABLE "external_address" DROP CONSTRAINT "FK_d288b9c0ec91db01f0285a2a985"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "fundingWalletId"`);
        await queryRunner.query(`DROP TABLE "funding_wallet"`);
        await queryRunner.query(`DROP TABLE "external_address"`);
    }
}
