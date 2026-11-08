import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792333768659 implements MigrationInterface {
    name = 'InitialSchema1792333768659'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."admins_role_enum" AS ENUM('admin', 'super_admin')`);
        await queryRunner.query(`CREATE TABLE "admins" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying, "role" "public"."admins_role_enum" NOT NULL DEFAULT 'admin', CONSTRAINT "UQ_051db7d37d478a69a7432df1479" UNIQUE ("email"), CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."cleaners_cleaningexperience_enum" AS ENUM('none', 'lessThanYear', 'oneToThree', 'threePlus')`);
        await queryRunner.query(`CREATE TYPE "public"."cleaners_availability_enum" AS ENUM('weekdayMornings', 'weekdayAfternoons', 'evenings', 'weekends', 'fullTime')`);
        await queryRunner.query(`CREATE TYPE "public"."cleaners_servicescando_enum" AS ENUM('home', 'office', 'rental', 'deep', 'afterRenovation', 'windows')`);
        await queryRunner.query(`CREATE TYPE "public"."cleaners_status_enum" AS ENUM('pending', 'verified', 'rejected')`);
        await queryRunner.query(`CREATE TYPE "public"."cleaners_language_enum" AS ENUM('hy', 'ru', 'en')`);
        await queryRunner.query(`CREATE TABLE "cleaners" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "fullName" character varying NOT NULL, "phone" character varying NOT NULL, "cityArea" character varying NOT NULL, "cleaningExperience" "public"."cleaners_cleaningexperience_enum", "availability" "public"."cleaners_availability_enum" array NOT NULL DEFAULT '{}', "servicesCanDo" "public"."cleaners_servicescando_enum" array NOT NULL DEFAULT '{}', "hasOwnSupplies" boolean NOT NULL, "message" text, "status" "public"."cleaners_status_enum" NOT NULL DEFAULT 'pending', "consentAccepted" boolean NOT NULL DEFAULT false, "language" "public"."cleaners_language_enum", "sourcePage" character varying, "pageUrl" character varying(300), CONSTRAINT "PK_899d12842115e9559aedf12c551" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cleaning_components" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "title" jsonb NOT NULL, "description" jsonb, CONSTRAINT "PK_faba2a3d6e47461cbb95809d0db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "contact_emails" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_46812f698ead8d9567e02bc6e9d" UNIQUE ("email"), CONSTRAINT "PK_fe57f999770a7da0338a9b29db3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "contact_phones" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "phone" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_d94ac212d9a865e7e4a0977a5f5" UNIQUE ("phone"), CONSTRAINT "PK_3263d07aba7c4dd305ee995148f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."media_assets_type_enum" AS ENUM('image', 'video')`);
        await queryRunner.query(`CREATE TYPE "public"."media_assets_status_enum" AS ENUM('pending', 'processing', 'ready', 'failed')`);
        await queryRunner.query(`CREATE TABLE "media_assets" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "type" "public"."media_assets_type_enum" NOT NULL, "status" "public"."media_assets_status_enum" NOT NULL DEFAULT 'pending', "key" character varying NOT NULL, "variants" jsonb, CONSTRAINT "PK_ca47e9f67a5e5d8af1e75d66ee6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "for_cleaners_section" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "title" jsonb, "description" jsonb, "mediaAssetId" integer, CONSTRAINT "PK_7dff136812811a876ae499b1a9c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cleaner_expectations" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "title" jsonb NOT NULL, "description" jsonb NOT NULL, "order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_2db2a11e0c71399241c46ab368f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hero_slides" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "mediaAssetId" integer NOT NULL, CONSTRAINT "PK_a66cc04fc23dc34ba5627fbbef4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "how_it_works_section" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "mediaAssetId" integer, CONSTRAINT "PK_f96f51ca1d1d7df05e705bbd9e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "how_it_works_steps" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "title" jsonb NOT NULL, "description" jsonb NOT NULL, "order" integer NOT NULL DEFAULT '0', "mediaAssetId" integer, CONSTRAINT "PK_3697151f2462e5749aae77bf951" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "privacy_policy" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "content" jsonb, CONSTRAINT "PK_5df3ca7aac1ca728f541a31fa74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."quotes_kindofclean_enum" AS ENUM('home', 'office', 'rental', 'deep')`);
        await queryRunner.query(`CREATE TYPE "public"."quotes_preferredtiming_enum" AS ENUM('thisWeek', 'nextWeek', 'flexible')`);
        await queryRunner.query(`CREATE TYPE "public"."quotes_language_enum" AS ENUM('hy', 'ru', 'en')`);
        await queryRunner.query(`CREATE TABLE "quotes" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "kindOfClean" "public"."quotes_kindofclean_enum", "name" character varying NOT NULL, "phone" character varying NOT NULL, "area" character varying NOT NULL, "preferredTiming" "public"."quotes_preferredtiming_enum", "message" text, "consentAccepted" boolean NOT NULL DEFAULT false, "language" "public"."quotes_language_enum", "sourcePage" character varying, "pageUrl" character varying(300), "assignedCleanerId" integer, CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "services" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "title" jsonb NOT NULL, "description" jsonb NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "order" integer NOT NULL DEFAULT '0', "mediaAssetId" integer NOT NULL, CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."social_links_platform_enum" AS ENUM('facebook', 'instagram', 'youtube', 'tiktok', 'x', 'linkedin', 'pinterest', 'snapchat', 'whatsapp', 'telegram', 'viber', 'messenger')`);
        await queryRunner.query(`CREATE TABLE "social_links" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "platform" "public"."social_links_platform_enum" NOT NULL, "url" character varying, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_8d68c1b08648c598af8ffa46a47" UNIQUE ("platform"), CONSTRAINT "PK_50d32c67ddd71c09d372b02167f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "standards_section" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "text" jsonb, "mediaAssetId" integer, CONSTRAINT "PK_b319ebbce84def66e766b347978" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "talk_to_us_section" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "title" jsonb, "text" jsonb, "mediaAssetId" integer, CONSTRAINT "PK_b0890a76e41f778d5ca3989c298" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "terms_and_conditions" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "content" jsonb, CONSTRAINT "PK_4ab651fa6e201399c954dbe263d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "password" character varying NOT NULL, "firstName" character varying, "lastName" character varying, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "services_cleaning_components" ("serviceId" integer NOT NULL, "cleaningComponentId" integer NOT NULL, CONSTRAINT "PK_dc27d919e0074ea102d105b0556" PRIMARY KEY ("serviceId", "cleaningComponentId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5b32f237480529f71c98edde75" ON "services_cleaning_components" ("serviceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_eada45f72675e29c3f1c012f2e" ON "services_cleaning_components" ("cleaningComponentId") `);
        await queryRunner.query(`ALTER TABLE "for_cleaners_section" ADD CONSTRAINT "FK_d2a273bde9e02c5eb46c17c8c57" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hero_slides" ADD CONSTRAINT "FK_6df4a66133093c53f4d7ec70543" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "how_it_works_section" ADD CONSTRAINT "FK_15ec1f9f7faaea657e31f224c8e" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "how_it_works_steps" ADD CONSTRAINT "FK_ccdd925a9802fdf7641c052b495" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quotes" ADD CONSTRAINT "FK_d6e4d5cf76c9fb362172152d2cc" FOREIGN KEY ("assignedCleanerId") REFERENCES "cleaners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "FK_d1df81504c8b99a7876d70068ff" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "standards_section" ADD CONSTRAINT "FK_bbb166e7e1706c9e5042ccca629" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "talk_to_us_section" ADD CONSTRAINT "FK_12952f761fd6b3cea7d28521168" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "services_cleaning_components" ADD CONSTRAINT "FK_5b32f237480529f71c98edde756" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "services_cleaning_components" ADD CONSTRAINT "FK_eada45f72675e29c3f1c012f2e0" FOREIGN KEY ("cleaningComponentId") REFERENCES "cleaning_components"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "services_cleaning_components" DROP CONSTRAINT "FK_eada45f72675e29c3f1c012f2e0"`);
        await queryRunner.query(`ALTER TABLE "services_cleaning_components" DROP CONSTRAINT "FK_5b32f237480529f71c98edde756"`);
        await queryRunner.query(`ALTER TABLE "talk_to_us_section" DROP CONSTRAINT "FK_12952f761fd6b3cea7d28521168"`);
        await queryRunner.query(`ALTER TABLE "standards_section" DROP CONSTRAINT "FK_bbb166e7e1706c9e5042ccca629"`);
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "FK_d1df81504c8b99a7876d70068ff"`);
        await queryRunner.query(`ALTER TABLE "quotes" DROP CONSTRAINT "FK_d6e4d5cf76c9fb362172152d2cc"`);
        await queryRunner.query(`ALTER TABLE "how_it_works_steps" DROP CONSTRAINT "FK_ccdd925a9802fdf7641c052b495"`);
        await queryRunner.query(`ALTER TABLE "how_it_works_section" DROP CONSTRAINT "FK_15ec1f9f7faaea657e31f224c8e"`);
        await queryRunner.query(`ALTER TABLE "hero_slides" DROP CONSTRAINT "FK_6df4a66133093c53f4d7ec70543"`);
        await queryRunner.query(`ALTER TABLE "for_cleaners_section" DROP CONSTRAINT "FK_d2a273bde9e02c5eb46c17c8c57"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eada45f72675e29c3f1c012f2e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5b32f237480529f71c98edde75"`);
        await queryRunner.query(`DROP TABLE "services_cleaning_components"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "terms_and_conditions"`);
        await queryRunner.query(`DROP TABLE "talk_to_us_section"`);
        await queryRunner.query(`DROP TABLE "standards_section"`);
        await queryRunner.query(`DROP TABLE "social_links"`);
        await queryRunner.query(`DROP TYPE "public"."social_links_platform_enum"`);
        await queryRunner.query(`DROP TABLE "services"`);
        await queryRunner.query(`DROP TABLE "quotes"`);
        await queryRunner.query(`DROP TYPE "public"."quotes_language_enum"`);
        await queryRunner.query(`DROP TYPE "public"."quotes_preferredtiming_enum"`);
        await queryRunner.query(`DROP TYPE "public"."quotes_kindofclean_enum"`);
        await queryRunner.query(`DROP TABLE "privacy_policy"`);
        await queryRunner.query(`DROP TABLE "how_it_works_steps"`);
        await queryRunner.query(`DROP TABLE "how_it_works_section"`);
        await queryRunner.query(`DROP TABLE "hero_slides"`);
        await queryRunner.query(`DROP TABLE "cleaner_expectations"`);
        await queryRunner.query(`DROP TABLE "for_cleaners_section"`);
        await queryRunner.query(`DROP TABLE "media_assets"`);
        await queryRunner.query(`DROP TYPE "public"."media_assets_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."media_assets_type_enum"`);
        await queryRunner.query(`DROP TABLE "contact_phones"`);
        await queryRunner.query(`DROP TABLE "contact_emails"`);
        await queryRunner.query(`DROP TABLE "cleaning_components"`);
        await queryRunner.query(`DROP TABLE "cleaners"`);
        await queryRunner.query(`DROP TYPE "public"."cleaners_language_enum"`);
        await queryRunner.query(`DROP TYPE "public"."cleaners_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."cleaners_servicescando_enum"`);
        await queryRunner.query(`DROP TYPE "public"."cleaners_availability_enum"`);
        await queryRunner.query(`DROP TYPE "public"."cleaners_cleaningexperience_enum"`);
        await queryRunner.query(`DROP TABLE "admins"`);
        await queryRunner.query(`DROP TYPE "public"."admins_role_enum"`);
    }

}
