import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignMedia1632475781407 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "campaign_media" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "campaignId" uuid NOT NULL, "channel" character varying NOT NULL, "media" character varying NOT NULL, "mediaFormat" character varying NOT NULL, "isDefault" BOOLEAN NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
