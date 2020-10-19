import {MigrationInterface, QueryRunner} from "typeorm";

export class campaignRequirements1603131042766 implements MigrationInterface {
    name = 'campaignRequirements1603131042766'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transfer" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "amount" character varying NOT NULL, "usdAmount" character varying, "action" character varying NOT NULL, "withdrawStatus" character varying, "payoutStatus" character varying, "payoutId" character varying, "ethAddress" character varying, "transactionHash" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "walletId" uuid, "campaignId" uuid, CONSTRAINT "PK_fd9ddbdd49a17afcbe014401295" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "wallet" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "balance" character varying NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "REL_35472b1fe48b6330cd34970956" UNIQUE ("userId"), CONSTRAINT "PK_bec464dd8d54c39c54fd32e2334" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "social_link" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying NOT NULL, "apiKey" character varying, "apiSecret" character varying, "followerCount" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_51b2adcc50ae969ba051eacd714" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "social_post" ("id" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'twitter', "likes" character varying NOT NULL DEFAULT 0, "shares" character varying NOT NULL DEFAULT 0, "comments" character varying NOT NULL DEFAULT 0, "participantId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "campaignId" uuid NOT NULL, CONSTRAINT "PK_361a1688e628ebb9c56ecc9cacb" PRIMARY KEY ("id", "userId", "campaignId"))`);
        await queryRunner.query(`CREATE TABLE "factor_link" ("factorId" character varying NOT NULL, "type" character varying NOT NULL, "name" character varying, "providerId" character varying NOT NULL, "identityId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_7d5e671b16cf72db6b0f825e79f" PRIMARY KEY ("factorId"))`);
        await queryRunner.query(`CREATE TABLE "twenty_four_hour_metric" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "score" character varying NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_5f2e32ce3d19006f27953af0bb8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "profile" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "username" character varying NOT NULL, "recoveryCode" character varying, "deviceToken" character varying, "email" character varying, "ageRange" text, "city" text, "state" text, "country" text, "interests" text NOT NULL DEFAULT '[]', "values" text NOT NULL DEFAULT '[]', "platforms" text NOT NULL DEFAULT '[]', "userId" uuid, CONSTRAINT "UQ_d80b94dc62f7467403009d88062" UNIQUE ("username"), CONSTRAINT "REL_a24972ebd73b106250713dcddd" UNIQUE ("userId"), CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "daily_participant_metric" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "clickCount" character varying NOT NULL DEFAULT 0, "viewCount" character varying NOT NULL DEFAULT 0, "submissionCount" character varying NOT NULL DEFAULT 0, "likeCount" character varying NOT NULL DEFAULT 0, "shareCount" character varying NOT NULL DEFAULT 0, "commentCount" character varying NOT NULL DEFAULT 0, "participationScore" character varying NOT NULL DEFAULT 0, "totalParticipationScore" character varying NOT NULL DEFAULT 0, "participantId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "campaignId" uuid, CONSTRAINT "PK_2941b85aab0073a60a1319ec3b4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "identityId" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "kycStatus" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "participant" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "clickCount" character varying NOT NULL DEFAULT 0, "viewCount" character varying NOT NULL DEFAULT 0, "submissionCount" character varying NOT NULL DEFAULT 0, "participationScore" character varying NOT NULL DEFAULT 0, "link" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid NOT NULL, "campaignId" uuid NOT NULL, CONSTRAINT "PK_b22a56c2e60aa49dd92b7cd839b" PRIMARY KEY ("id", "userId", "campaignId"))`);
        await queryRunner.query(`CREATE TABLE "campaign" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying NOT NULL, "beginDate" TIMESTAMP WITH TIME ZONE NOT NULL, "endDate" TIMESTAMP WITH TIME ZONE NOT NULL, "coiinTotal" character varying NOT NULL, "totalParticipationScore" character varying NOT NULL DEFAULT 0, "target" character varying NOT NULL, "description" character varying DEFAULT '', "company" character varying NOT NULL DEFAULT 'raiinmaker', "tagline" character varying, "algorithm" jsonb NOT NULL, "audited" boolean NOT NULL DEFAULT false, "targetVideo" character varying, "imagePath" character varying, "suggestedPosts" text NOT NULL DEFAULT '[]', "suggestedTags" text NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0ce34d26e7f2eb316a3a592cdc4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD CONSTRAINT "FK_011b4b0e8490d5434857bd40efa" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD CONSTRAINT "FK_bbe21a18f940dab59ffd61671ef" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD CONSTRAINT "FK_35472b1fe48b6330cd349709564" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD CONSTRAINT "FK_d8a1d8b8a8235632f9011346197" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD CONSTRAINT "FK_ac33a6e1367ede7117c1742d6a4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD CONSTRAINT "FK_3073fc6f7d48ae9dc23af5f00f6" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "factor_link" ADD CONSTRAINT "FK_99411cf70077d94b6330dba9ece" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" ADD CONSTRAINT "FK_e965aecf58d4a7ff9406ab777e1" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "profile" ADD CONSTRAINT "FK_a24972ebd73b106250713dcddd9" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "daily_participant_metric" ADD CONSTRAINT "FK_82c4ef42af06b025fe03a6b7d34" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "daily_participant_metric" ADD CONSTRAINT "FK_339b0794c16489770996c4991ca" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "FK_b915e97dea27ffd1e40c8003b3b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "FK_1835802549e230f6cd88c6efef9" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TABLE "query-result-cache" ("id" SERIAL NOT NULL, "identifier" character varying, "time" bigint NOT NULL, "duration" integer NOT NULL, "query" text NOT NULL, "result" text NOT NULL, CONSTRAINT "PK_6a98f758d8bfd010e7e10ffd3d3" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "query-result-cache"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_1835802549e230f6cd88c6efef9"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_b915e97dea27ffd1e40c8003b3b"`);
        await queryRunner.query(`ALTER TABLE "daily_participant_metric" DROP CONSTRAINT "FK_339b0794c16489770996c4991ca"`);
        await queryRunner.query(`ALTER TABLE "daily_participant_metric" DROP CONSTRAINT "FK_82c4ef42af06b025fe03a6b7d34"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP CONSTRAINT "FK_a24972ebd73b106250713dcddd9"`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" DROP CONSTRAINT "FK_e965aecf58d4a7ff9406ab777e1"`);
        await queryRunner.query(`ALTER TABLE "factor_link" DROP CONSTRAINT "FK_99411cf70077d94b6330dba9ece"`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP CONSTRAINT "FK_3073fc6f7d48ae9dc23af5f00f6"`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP CONSTRAINT "FK_ac33a6e1367ede7117c1742d6a4"`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP CONSTRAINT "FK_d8a1d8b8a8235632f9011346197"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_35472b1fe48b6330cd349709564"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_bbe21a18f940dab59ffd61671ef"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_011b4b0e8490d5434857bd40efa"`);
        await queryRunner.query(`DROP TABLE "campaign"`);
        await queryRunner.query(`DROP TABLE "participant"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "daily_participant_metric"`);
        await queryRunner.query(`DROP TABLE "profile"`);
        await queryRunner.query(`DROP TABLE "twenty_four_hour_metric"`);
        await queryRunner.query(`DROP TABLE "factor_link"`);
        await queryRunner.query(`DROP TABLE "social_post"`);
        await queryRunner.query(`DROP TABLE "social_link"`);
        await queryRunner.query(`DROP TABLE "wallet"`);
        await queryRunner.query(`DROP TABLE "transfer"`);
    }

}
