import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv'; // dotenvをインストールして使用する場合

config(); // .envファイルから環境変数を読み込む

export const dataSourceOptions: DataSourceOptions = {
  type: 'mssql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false, // 本番環境ではfalse推奨、マイグレーションで管理
  logging: process.env.NODE_ENV === 'development', // 開発環境でのみログ出力
  entities: [__dirname + '/src/entities/**/*.ts'], // エンティティファイルのパス
  migrations: [__dirname + '/src/migrations/**/*.ts'], // マイグレーションファイルのパス
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