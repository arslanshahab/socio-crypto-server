import {MigrationInterface, QueryRunner} from "typeorm";

export class ParticipantEmailField1608062319200 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "participant" ADD "email" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "email"`);
    }

}
