import {MigrationInterface, QueryRunner} from "typeorm";

export class UserIdentityDecoupling1592868796848 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" ADD "identityId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_35472b1fe48b6330cd349709564"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "REL_35472b1fe48b6330cd34970956"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD CONSTRAINT "UQ_35472b1fe48b6330cd349709564" UNIQUE ("userId")`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP CONSTRAINT "FK_d8a1d8b8a8235632f9011346197"`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP CONSTRAINT "FK_ac33a6e1367ede7117c1742d6a4"`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP CONSTRAINT "PK_361a1688e628ebb9c56ecc9cacb"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD CONSTRAINT "PK_2c0e48c3d55dccbdd8b1144ae4b" PRIMARY KEY ("id", "campaignId")`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP CONSTRAINT "PK_2c0e48c3d55dccbdd8b1144ae4b"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD CONSTRAINT "PK_361a1688e628ebb9c56ecc9cacb" PRIMARY KEY ("id", "campaignId", "userId")`);
        await queryRunner.query(`ALTER TABLE "factor_link" DROP CONSTRAINT "FK_99411cf70077d94b6330dba9ece"`);
        await queryRunner.query(`ALTER TABLE "factor_link" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "factor_link" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" DROP CONSTRAINT "FK_e965aecf58d4a7ff9406ab777e1"`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_b915e97dea27ffd1e40c8003b3b"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "PK_cace4a159ff9f2512dd42373760"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "id" uuid NOT NULL DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "PK_b22a56c2e60aa49dd92b7cd839b"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "PK_6476aa79befa890752b9b504de8" PRIMARY KEY ("id", "campaignId")`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "PK_6476aa79befa890752b9b504de8"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "PK_b22a56c2e60aa49dd92b7cd839b" PRIMARY KEY ("id", "campaignId", "userId")`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD CONSTRAINT "FK_35472b1fe48b6330cd349709564" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD CONSTRAINT "FK_d8a1d8b8a8235632f9011346197" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD CONSTRAINT "FK_ac33a6e1367ede7117c1742d6a4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "factor_link" ADD CONSTRAINT "FK_99411cf70077d94b6330dba9ece" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" ADD CONSTRAINT "FK_e965aecf58d4a7ff9406ab777e1" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "FK_b915e97dea27ffd1e40c8003b3b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "FK_b915e97dea27ffd1e40c8003b3b"`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" DROP CONSTRAINT "FK_e965aecf58d4a7ff9406ab777e1"`);
        await queryRunner.query(`ALTER TABLE "factor_link" DROP CONSTRAINT "FK_99411cf70077d94b6330dba9ece"`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP CONSTRAINT "FK_ac33a6e1367ede7117c1742d6a4"`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP CONSTRAINT "FK_d8a1d8b8a8235632f9011346197"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_35472b1fe48b6330cd349709564"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "PK_b22a56c2e60aa49dd92b7cd839b"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "PK_6476aa79befa890752b9b504de8" PRIMARY KEY ("id", "campaignId")`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "PK_6476aa79befa890752b9b504de8"`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "PK_b22a56c2e60aa49dd92b7cd839b" PRIMARY KEY ("id", "userId", "campaignId")`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "PK_cace4a159ff9f2512dd42373760"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "FK_b915e97dea27ffd1e40c8003b3b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" ADD "userId" character varying`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" ADD CONSTRAINT "FK_e965aecf58d4a7ff9406ab777e1" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "factor_link" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "factor_link" ADD "userId" character varying`);
        await queryRunner.query(`ALTER TABLE "factor_link" ADD CONSTRAINT "FK_99411cf70077d94b6330dba9ece" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP CONSTRAINT "PK_361a1688e628ebb9c56ecc9cacb"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD CONSTRAINT "PK_2c0e48c3d55dccbdd8b1144ae4b" PRIMARY KEY ("id", "campaignId")`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP CONSTRAINT "PK_2c0e48c3d55dccbdd8b1144ae4b"`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD CONSTRAINT "PK_361a1688e628ebb9c56ecc9cacb" PRIMARY KEY ("id", "userId", "campaignId")`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD CONSTRAINT "FK_ac33a6e1367ede7117c1742d6a4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "userId" character varying`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD CONSTRAINT "FK_d8a1d8b8a8235632f9011346197" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "UQ_35472b1fe48b6330cd349709564"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD "userId" character varying`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD CONSTRAINT "REL_35472b1fe48b6330cd34970956" UNIQUE ("userId")`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD CONSTRAINT "FK_35472b1fe48b6330cd349709564" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "identityId"`);
    }

}
