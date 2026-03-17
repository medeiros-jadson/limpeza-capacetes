import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Machine, Session, Payment, Feedback, CleaningType, Coupon, MercadoPagoConfig } from './entities-all';
import { InitialSchema1739700000000 } from './migrations/1739700000000-InitialSchema';
import { CleaningTypes1739800000000 } from './migrations/1739800000000-CleaningTypes';
import { CleaningTypeInsertReais1739900000000 } from './migrations/1739900000000-CleaningTypeInsertReais';
import { FixCleaningTypesType1739950000000 } from './migrations/1739950000000-FixCleaningTypesType';
import { CleaningTypesPriceReais1740000000000 } from './migrations/1740000000000-CleaningTypesPriceReais';
import { MachinesPriceReais1740100000000 } from './migrations/1740100000000-MachinesPriceReais';
import { Coupons1740200000000 } from './migrations/1740200000000-Coupons';
import { SessionCouponId1740300000000 } from './migrations/1740300000000-SessionCouponId';
import { MercadoPagoConfig1740400000000 } from './migrations/1740400000000-MercadoPagoConfig';

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
  entities: [Machine, Session, Payment, Feedback, CleaningType, Coupon, MercadoPagoConfig],
  migrations: [InitialSchema1739700000000, CleaningTypes1739800000000, CleaningTypeInsertReais1739900000000, FixCleaningTypesType1739950000000, CleaningTypesPriceReais1740000000000, MachinesPriceReais1740100000000, Coupons1740200000000, SessionCouponId1740300000000, MercadoPagoConfig1740400000000],
  subscribers: [],
});

export async function getDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
}
