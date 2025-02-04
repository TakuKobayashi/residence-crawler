import mysql, { Pool, FieldPacket, QueryResult } from 'mysql2/promise';

export class DatabaseConnectionManager {
  private mysqlPool?: Pool;

  async executeInnerMySQLPool(onExecute: (pool: Pool) => Promise<void>) {
    const pool = this.createPool();
    await onExecute(pool);
    await this.release();
  }

  async query(sql: string): Promise<[any, any]> {
    const pool = this.createPool();
    return pool.query(sql);
  }

  private createPool(): Pool {
    if (this.mysqlPool) {
      return this.mysqlPool;
    }
    this.mysqlPool = mysql.createPool({
      database: process.env.MYSQL_DATABASE || '',
      host: process.env.MYSQL_HOST || '',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USERNAME || '',
      password: process.env.MYSQL_ROOT_PASSWORD || '',
      connectionLimit: 20, // 接続を張り続けるコネクション数を指定
    });
    return this.mysqlPool;
  }

  async release() {
    await this.mysqlPool?.end();
    this.mysqlPool = undefined;
  }
}
