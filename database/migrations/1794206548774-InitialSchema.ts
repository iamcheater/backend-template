import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1794206548774 implements MigrationInterface {
    name = 'InitialSchema1794206548774'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."media_assets_type_enum" AS ENUM('image', 'video')`);
        await queryRunner.query(`CREATE TYPE "public"."media_assets_status_enum" AS ENUM('pending', 'processing', 'ready', 'failed')`);
        await queryRunner.query(`CREATE TABLE "media_assets" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "type" "public"."media_assets_type_enum" NOT NULL, "status" "public"."media_assets_status_enum" NOT NULL DEFAULT 'pending', "key" character varying NOT NULL, "variants" jsonb, CONSTRAINT "PK_ca47e9f67a5e5d8af1e75d66ee6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."admins_role_enum" AS ENUM('admin', 'super_admin')`);
        await queryRunner.query(`CREATE TABLE "admins" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying, "role" "public"."admins_role_enum" NOT NULL DEFAULT 'admin', CONSTRAINT "UQ_051db7d37d478a69a7432df1479" UNIQUE ("email"), CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "admins"`);
        await queryRunner.query(`DROP TYPE "public"."admins_role_enum"`);
        await queryRunner.query(`DROP TABLE "media_assets"`);
        await queryRunner.query(`DROP TYPE "public"."media_assets_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."media_assets_type_enum"`);
    }

}
