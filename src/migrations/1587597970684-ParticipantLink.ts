import {MigrationInterface, QueryRunner} from "typeorm";

export class ParticipantLink1587597970684 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "participant" ADD "link" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "link"`);
    }

}
