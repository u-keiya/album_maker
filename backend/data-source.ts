import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv'; // dotenvをインストールして使用する場合

config(); // .envファイルから環境変数を読み込む

export const dataSourceOptions: DataSourceOptions = {
  type: 'mssql',
  host: process.env.DATABASE_HOST, // Corrected env var name
  port: parseInt(process.env.DATABASE_PORT || '1433', 10), // Corrected env var name
  username: process.env.DATABASE_USERNAME, // Corrected env var name
  password: process.env.DATABASE_PASSWORD, // Corrected env var name
  database: process.env.DATABASE_NAME, // Corrected env var name
  synchronize: false, // 本番環境ではfalse推奨、マイグレーションで管理
  logging: process.env.NODE_ENV === 'development', // 開発環境でのみログ出力
  entities: [__dirname + '/src/entities/**/*.{ts,js}'], // Correct path to include src
  migrations: [__dirname + '/src/migrations/**/*.{ts,js}'], // Correct path to include src
  subscribers: [],
  extra: {
    trustServerCertificate: true, // Azure SQL Database接続に必要になる場合がある
  },
  options: {
    encrypt: true, // Azure SQL Databaseでは通常true
  }
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;