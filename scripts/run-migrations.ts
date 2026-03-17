/**
 * Roda as migrations do TypeORM.
 * Local: npm run migration:run (ou DATABASE_URL=... npx ts-node ...)
 * Docker: docker compose run --rm migrate
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
