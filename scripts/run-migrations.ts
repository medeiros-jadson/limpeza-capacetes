/**
 * Roda as migrations do TypeORM.
 * Uso: DATABASE_URL=postgresql://... npx ts-node -r tsconfig/register.json scripts/run-migrations.ts
 * No droplet (Docker): docker compose run --rm -e DATABASE_URL=postgresql://postgres:postgres@db:5432/limpeza_capacetes app npx ts-node -r tsconfig/register.json scripts/run-migrations.ts
 */
import 'reflect-metadata';
import { AppDataSource } from '../lib/data-source';

async function main() {
  await AppDataSource.initialize();
  const run = await AppDataSource.runMigrations();
  console.log('Migrations executadas:', run.length);
  run.forEach((m) => console.log(' -', m.name));
  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
