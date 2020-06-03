import {MigrationInterface, QueryRunner} from "typeorm";

export class TwentyFourHour1591130650431 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "twenty_four_hour_metric" ("id" uuid NOT NULL, "score" bigint NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying, CONSTRAINT "PK_5f2e32ce3d19006f27953af0bb8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" ADD CONSTRAINT "FK_e965aecf58d4a7ff9406ab777e1" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "twenty_four_hour_metric" DROP CONSTRAINT "FK_e965aecf58d4a7ff9406ab777e1"`);
        await queryRunner.query(`DROP TABLE "twenty_four_hour_metric"`);
    }

}
