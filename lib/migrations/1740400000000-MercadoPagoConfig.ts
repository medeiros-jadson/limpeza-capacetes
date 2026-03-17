import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabela de configuração do Mercado Pago (token, e-mail, webhook secret).
 * Uma única linha; atualizar via SQL ou API PATCH /api/config/mercadopago.
 */
export class MercadoPagoConfig1740400000000 implements MigrationInterface {
  name = 'MercadoPagoConfig1740400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mercadopago_config" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "access_token" character varying(512),
        "payer_email" character varying(255),
        "webhook_secret" character varying(512),
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "PK_mercadopago_config" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "mercadopago_config" ("id", "access_token", "payer_email", "webhook_secret", "active", "created_at")
      SELECT uuid_generate_v4(), NULL, NULL, NULL, true, now()
      WHERE NOT EXISTS (SELECT 1 FROM "mercadopago_config" LIMIT 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "mercadopago_config"`);
  }
}
