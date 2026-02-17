import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1739700000000 implements MigrationInterface {
  name = 'InitialSchema1739700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "machines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "location" character varying(255),
        "status" character varying(20) NOT NULL DEFAULT 'IDLE',
        "ip_or_identifier" character varying(255),
        "last_seen_at" TIMESTAMP WITH TIME ZONE,
        "price_cents" integer NOT NULL DEFAULT 500,
        "api_token" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_7b0817c026ee9ce86b2d7b2a8b8" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "machine_id" uuid NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'CREATED',
        "price" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "started_at" TIMESTAMP WITH TIME ZONE,
        "finished_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_3238ef96f18b355b671619fbc9f" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "session_id" uuid NOT NULL,
        "provider" character varying(50) NOT NULL DEFAULT 'mercadopago',
        "amount" integer NOT NULL,
        "status" character varying(30) NOT NULL,
        "external_id" character varying(255),
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_197ab7af5a9c2a0d96e2e8a8b8c" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "feedbacks" (
        "session_id" uuid NOT NULL,
        "emotion" character varying(20) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_feedbacks_session" PRIMARY KEY ("session_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "feedbacks"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "machines"`);
  }
}
