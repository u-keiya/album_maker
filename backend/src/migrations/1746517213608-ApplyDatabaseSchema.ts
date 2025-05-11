import { MigrationInterface, QueryRunner } from "typeorm";

export class ApplyDatabaseSchema1746517213608 implements MigrationInterface {
    name = 'ApplyDatabaseSchema1746517213608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "album_objects" ("object_id" uniqueidentifier NOT NULL CONSTRAINT "DF_9f1ffd2c39acfa10d916d7f7982" DEFAULT NEWSEQUENTIALID(), "page_id" uniqueidentifier NOT NULL, "type" nvarchar(20) NOT NULL, "position_x" int NOT NULL CONSTRAINT "DF_c359c522344aaf87b320cd42133" DEFAULT 0, "position_y" int NOT NULL CONSTRAINT "DF_cd0edd7aee935b637c4f9c19e72" DEFAULT 0, "width" int NOT NULL, "height" int NOT NULL, "rotation" float NOT NULL CONSTRAINT "DF_0fe253bd70031b16c4cc65d162f" DEFAULT 0, "z_index" int NOT NULL CONSTRAINT "DF_72a555864202689d5638f9a50b6" DEFAULT 0, "content_data" nvarchar(MAX) NOT NULL, "created_at" datetimeoffset NOT NULL CONSTRAINT "DF_aeacd5a2edc711e3b97f29c85b7" DEFAULT getdate(), "updated_at" datetimeoffset NOT NULL CONSTRAINT "DF_60ab3084d763176baa8d5c92a67" DEFAULT getdate(), CONSTRAINT "CHK_d56569318d10940711f463416a" CHECK ("type" IN ('photo', 'sticker', 'text', 'drawing')), CONSTRAINT "PK_9f1ffd2c39acfa10d916d7f7982" PRIMARY KEY ("object_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f15aa5929692b1b368a7ae29e1" ON "album_objects" ("page_id") `);
        await queryRunner.query(`CREATE TABLE "album_pages" ("page_id" uniqueidentifier NOT NULL CONSTRAINT "DF_7116e7ddb1fb598e876a313142c" DEFAULT NEWSEQUENTIALID(), "album_id" uniqueidentifier NOT NULL, "page_number" int NOT NULL, "created_at" datetimeoffset NOT NULL CONSTRAINT "DF_d600319740cf41524955a56d80d" DEFAULT getdate(), "updated_at" datetimeoffset NOT NULL CONSTRAINT "DF_5b557278404ff2acce1b51f0204" DEFAULT getdate(), CONSTRAINT "UQ_c13e46714ada9ddbb9507e52336" UNIQUE ("album_id", "page_number"), CONSTRAINT "PK_7116e7ddb1fb598e876a313142c" PRIMARY KEY ("page_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ba1cc727c0d1166104ecc94dcc" ON "album_pages" ("album_id") `);
        await queryRunner.query(`CREATE TABLE "albums" ("album_id" uniqueidentifier NOT NULL CONSTRAINT "DF_6d21b668e81f4be7445062b024a" DEFAULT NEWSEQUENTIALID(), "user_id" uniqueidentifier NOT NULL, "title" nvarchar(100) NOT NULL CONSTRAINT "DF_2c85c318a6c245b0eecc2081952" DEFAULT '新しいアルバム', "created_at" datetimeoffset NOT NULL CONSTRAINT "DF_69fd5a6fd086b8c0ea1c2c564e5" DEFAULT getdate(), "updated_at" datetimeoffset NOT NULL CONSTRAINT "DF_a3294ca91d5d4b95709b3100600" DEFAULT getdate(), CONSTRAINT "PK_6d21b668e81f4be7445062b024a" PRIMARY KEY ("album_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2c6a2dfb05cb87cc38e2a8b9dc" ON "albums" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "photos" ("photo_id" uniqueidentifier NOT NULL CONSTRAINT "DF_81414cde6651382acfbe171ef1f" DEFAULT NEWSEQUENTIALID(), "user_id" uniqueidentifier NOT NULL, "file_path" nvarchar(MAX) NOT NULL, "original_filename" nvarchar(MAX) NOT NULL, "uploaded_at" datetimeoffset NOT NULL CONSTRAINT "DF_a9a7153e949b27ee1b2c685f48c" DEFAULT getdate(), "file_size" bigint, "mime_type" nvarchar(50), CONSTRAINT "PK_81414cde6651382acfbe171ef1f" PRIMARY KEY ("photo_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c4404a2ee605249b508c623e68" ON "photos" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "users" ("user_id" uniqueidentifier NOT NULL CONSTRAINT "DF_96aac72f1574b88752e9fb00089" DEFAULT NEWSEQUENTIALID(), "username" nvarchar(50) NOT NULL, "password_hash" nvarchar(MAX) NOT NULL, "created_at" datetimeoffset NOT NULL CONSTRAINT "DF_c9b5b525a96ddc2c5647d7f7fa5" DEFAULT getdate(), "updated_at" datetimeoffset NOT NULL CONSTRAINT "DF_6d596d799f9cb9dac6f7bf7c23c" DEFAULT getdate(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_96aac72f1574b88752e9fb00089" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `);
        await queryRunner.query(`ALTER TABLE "album_objects" ADD CONSTRAINT "FK_f15aa5929692b1b368a7ae29e11" FOREIGN KEY ("page_id") REFERENCES "album_pages"("page_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "album_pages" ADD CONSTRAINT "FK_ba1cc727c0d1166104ecc94dccf" FOREIGN KEY ("album_id") REFERENCES "albums"("album_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "albums" ADD CONSTRAINT "FK_2c6a2dfb05cb87cc38e2a8b9dc1" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "photos" ADD CONSTRAINT "FK_c4404a2ee605249b508c623e68f" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // Create stickers table
        await queryRunner.query(`CREATE TABLE "stickers" ("sticker_id" uniqueidentifier NOT NULL CONSTRAINT "DF_stickers_sticker_id" DEFAULT NEWSEQUENTIALID(), "name" nvarchar(100) NOT NULL, "category" nvarchar(50), "file_path" nvarchar(MAX) NOT NULL, "thumbnail_path" nvarchar(MAX), "tags" nvarchar(MAX), "created_at" datetimeoffset NOT NULL CONSTRAINT "DF_stickers_created_at" DEFAULT getdate(), "updated_at" datetimeoffset NOT NULL CONSTRAINT "DF_stickers_updated_at" DEFAULT getdate(), CONSTRAINT "PK_stickers_sticker_id" PRIMARY KEY ("sticker_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_stickers_name" ON "stickers" ("name")`);
        await queryRunner.query(`CREATE INDEX "IDX_stickers_category" ON "stickers" ("category")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_stickers_category" ON "stickers"`);
        await queryRunner.query(`DROP INDEX "IDX_stickers_name" ON "stickers"`);
        await queryRunner.query(`DROP TABLE "stickers"`);

        await queryRunner.query(`ALTER TABLE "photos" DROP CONSTRAINT "FK_c4404a2ee605249b508c623e68f"`);
        await queryRunner.query(`ALTER TABLE "albums" DROP CONSTRAINT "FK_2c6a2dfb05cb87cc38e2a8b9dc1"`);
        await queryRunner.query(`ALTER TABLE "album_pages" DROP CONSTRAINT "FK_ba1cc727c0d1166104ecc94dccf"`);
        await queryRunner.query(`ALTER TABLE "album_objects" DROP CONSTRAINT "FK_f15aa5929692b1b368a7ae29e11"`);
        await queryRunner.query(`DROP INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "IDX_c4404a2ee605249b508c623e68" ON "photos"`);
        await queryRunner.query(`DROP TABLE "photos"`);
        await queryRunner.query(`DROP INDEX "IDX_2c6a2dfb05cb87cc38e2a8b9dc" ON "albums"`);
        await queryRunner.query(`DROP TABLE "albums"`);
        await queryRunner.query(`DROP INDEX "IDX_ba1cc727c0d1166104ecc94dcc" ON "album_pages"`);
        await queryRunner.query(`DROP TABLE "album_pages"`);
        await queryRunner.query(`DROP INDEX "IDX_f15aa5929692b1b368a7ae29e1" ON "album_objects"`);
        await queryRunner.query(`DROP TABLE "album_objects"`);
    }

}
