import mysql from 'mysql2/promise';
import pg from 'pg';
import config from '../../sequelize/config/config';

type DirectType = 'mysql' | 'postgres';

export class DatabaseConnectionManager {
  private dbConnectionPool?: mysql.Pool | pg.Pool;
  private dialect: DirectType;

  constructor() {
    this.dialect = config.dialect;
  }

  async query(sql: string): Promise<any> {
    const pool = this.createPool();
    return pool.query(sql);
  }

  private createPool(): any {
    if (this.dbConnectionPool) {
      return this.dbConnectionPool;
    }
    if (this.dialect === 'mysql') {
      this.dbConnectionPool = mysql.createPool({
        database: process.env.MYSQL_DATABASE || '',
        host: process.env.MYSQL_HOST || '',
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USERNAME || '',
        password: process.env.MYSQL_ROOT_PASSWORD || '',
        connectionLimit: 20, // 接続を張り続けるコネクション数を指定
      });
    } else {
      this.dbConnectionPool = new pg.Pool({
        database: process.env.PGSQL_DATABASE || '',
        host: process.env.PGSQL_HOST || '',
        port: Number(process.env.PGSQL_PORT || 5432),
        user: process.env.PGSQL_USERNAME || '',
        password: process.env.PGSQL_ROOT_PASSWORD || '',
        max: 20, // 接続を張り続けるコネクション数を指定
      });
    }
    return this.dbConnectionPool;
  }

  async release() {
    await this.dbConnectionPool?.end();
    this.dbConnectionPool = undefined;
  }
}
