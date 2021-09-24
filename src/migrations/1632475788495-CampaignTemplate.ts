import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignTemplate1632475788495 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "campaign_template" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "campaignId" uuid NOT NULL, "channel" character varying NOT NULL, "post" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
