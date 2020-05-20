import {MigrationInterface, QueryRunner} from "typeorm";

export class ParticipantUsername1590019034918 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "participant" ADD "username" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "participant" ADD CONSTRAINT "UQ_98bcc28e15be54f4fa3f99a8ad3" UNIQUE ("username")`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "participant" DROP CONSTRAINT "UQ_98bcc28e15be54f4fa3f99a8ad3"`);
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "username"`);
    }

}
