import {MigrationInterface, QueryRunner} from "typeorm";

export class SuggestedCampaignPosting1588005829837 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" ADD "suggestedPosts" text NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "suggestedTags" text NOT NULL DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "suggestedTags"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "suggestedPosts"`);
    }

}
