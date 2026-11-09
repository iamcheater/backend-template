import 'dotenv/config';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AdminEntity } from '../src/core/admin/entities';
import { MediaAssetEntity } from '../src/core/media/entities';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  entities: [AdminEntity, MediaAssetEntity],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: ['local', 'test'].includes(process.env.NODE_ENV ?? ''),
  logging: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);
