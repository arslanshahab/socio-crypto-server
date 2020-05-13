import {MigrationInterface, QueryRunner} from "typeorm";

export class FactorLink1589389483954 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "factor_link" ("factorId" character varying NOT NULL, "type" character varying NOT NULL, "identityId" character varying NOT NULL, "userId" character varying, CONSTRAINT "PK_7d5e671b16cf72db6b0f825e79f" PRIMARY KEY ("factorId"))`);
        await queryRunner.query(`ALTER TABLE "factor_link" ADD CONSTRAINT "FK_99411cf70077d94b6330dba9ece" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "factor_link" DROP CONSTRAINT "FK_99411cf70077d94b6330dba9ece"`);
        await queryRunner.query(`DROP TABLE "factor_link"`);
    }

}
