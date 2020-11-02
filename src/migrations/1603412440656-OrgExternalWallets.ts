import {MigrationInterface, QueryRunner} from "typeorm";

export class OrgExternalWallets1603412440656 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "external_wallet" ADD "orgId" uuid`);
        await queryRunner.query(`ALTER TABLE "external_wallet" ADD CONSTRAINT "FK_9df582d498e093cd579740f5c4c" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "external_wallet" DROP CONSTRAINT "FK_9df582d498e093cd579740f5c4c"`);
        await queryRunner.query(`ALTER TABLE "external_wallet" DROP COLUMN "orgId"`);
    }

}
