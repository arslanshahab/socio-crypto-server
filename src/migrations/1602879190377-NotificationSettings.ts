import {MigrationInterface, QueryRunner} from "typeorm";

export class NotificationSettings1602879190377 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "notification_settings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "kyc" boolean NOT NULL DEFAULT true, "withdraw" boolean NOT NULL DEFAULT true, "newCampaign" boolean NOT NULL DEFAULT true, "campaignUpdates" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d131abd7996c475ef768d4559ba" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "notification_settings"`);
    }

}
