import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove o tipo composto "cleaning_types" órfão (quando a tabela foi dropada manualmente)
 * e garante que a tabela exista. Resolve: duplicate key "pg_type_typname_nsp_index".
 */
export class FixCleaningTypesType1739950000000 implements MigrationInterface {
  name = 'FixCleaningTypesType1739950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TYPE IF EXISTS "cleaning_types" CASCADE`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cleaning_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "price" NUMERIC(10,2) NOT NULL DEFAULT 0,
        "duration_seconds" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cleaning_types" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    /* não reverte para não dropar a tabela em uso */
  }
}
