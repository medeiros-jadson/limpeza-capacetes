import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cria tabela coupons (código, porcentagem de desconto, ativo).
 */
export class Coupons1740200000000 implements MigrationInterface {
  name = 'Coupons1740200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(64) NOT NULL,
        "discount_percent" integer NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_coupons_code" UNIQUE ("code"),
        CONSTRAINT "PK_coupons" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "coupons"`);
  }
}
