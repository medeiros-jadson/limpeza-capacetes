import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Machine, Session, Payment, Feedback } from './entities-all';
import { InitialSchema1739700000000 } from './migrations/1739700000000-InitialSchema';

const dbUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/limpeza_capacetes';

// Extrai opções da URL e garante que password seja sempre string (evita erro SCRAM do pg)
function parseDbOptions(url: string) {
  try {
    const u = new URL(url);
    const pathname = u.pathname.replace(/^\//, '');
    return {
      host: u.hostname,
      port: parseInt(u.port || '5432', 10),
      username: u.username || 'postgres',
      password: u.password ?? '',
      database: pathname || 'limpeza_capacetes',
    };
  } catch {
    return {
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '',
      database: 'limpeza_capacetes',
    };
  }
}

const dbOptions = parseDbOptions(dbUrl);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbOptions.host,
  port: dbOptions.port,
  username: dbOptions.username,
  password: dbOptions.password,
  database: dbOptions.database,
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  entities: [Machine, Session, Payment, Feedback],
  migrations: [InitialSchema1739700000000],
  subscribers: [],
});

export async function getDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}
