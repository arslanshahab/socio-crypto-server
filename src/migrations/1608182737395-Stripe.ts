import { MigrationInterface, QueryRunner } from "typeorm";

export class Stripe1608182737395 implements MigrationInterface {
    name = "Stripe1608182737395";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" RENAME COLUMN "withdrawStatus" TO "status"`);
        await queryRunner.query(`ALTER TABLE "org" ADD "stripeId" character varying`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "currency" character varying`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "stripeCardId" character varying`);
        await queryRunner.query(
            `CREATE TABLE "escrow" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "amount" character varying NOT NULL, "fundingWalletId" uuid, "campaignId" uuid, CONSTRAINT "REL_9a7c2a319665a11a340b523f59" UNIQUE ("campaignId"), CONSTRAINT "PK_4aafc323d34fd7979460661ab4a" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "escrow" ADD CONSTRAINT "FK_e0ad6604a987e01b17965bdeae4" FOREIGN KEY ("fundingWalletId") REFERENCES "funding_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "escrow" ADD CONSTRAINT "FK_9a7c2a319665a11a340b523f591" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(`ALTER TABLE "campaign" ADD "status" character varying NOT NULL DEFAULT 'DEFAULT'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" RENAME COLUMN "status" TO "withdrawStatus"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "stripeCardId"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "org" DROP COLUMN "stripeId"`);
        await queryRunner.query(`ALTER TABLE "escrow" DROP CONSTRAINT "FK_9a7c2a319665a11a340b523f591"`);
        await queryRunner.query(`ALTER TABLE "escrow" DROP CONSTRAINT "FK_e0ad6604a987e01b17965bdeae4"`);
        await queryRunner.query(`DROP TABLE "escrow"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "status"`);
    }
}
