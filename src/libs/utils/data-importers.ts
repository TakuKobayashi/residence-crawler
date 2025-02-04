import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';
import readline from 'readline';
import mysql, { QueryResult, FieldPacket } from 'mysql2/promise';

const pool = mysql.createPool({
  database: process.env.MYSQL_DATABASE || '',
  host: process.env.MYSQL_HOST || '',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USERNAME || '',
  password: process.env.MYSQL_ROOT_PASSWORD || '',
  connectionLimit: 20, // 接続を張り続けるコネクション数を指定
});

export async function importFromSqls() {
  const appDir = path.dirname(require.main?.filename || '');
  const sqlFilePathes = fg.sync([...appDir.split(path.sep), `..`, 'data', 'sqls', `tables`, '**', '*.sql'].join('/'), { dot: true });
  for (const sqlFilePath of sqlFilePathes) {
    console.log(sqlFilePath);
    await new Promise<void>((resolve, reject) => {
      // 量が多いのでSQLは表示しない
      const executeSqlPromises: Promise<[QueryResult, FieldPacket[]]>[] = [];
      const insertSqlFileStream = fs.createReadStream(sqlFilePath);
      const reader = readline.createInterface({ input: insertSqlFileStream });
      reader.on('line', async (insertSql) => {
        if (insertSql.length > 0) {
          executeSqlPromises.push(pool.query(insertSql));
          // 非同期でINSERTを実行しすぎると処理しきれなくなるので途中でいったん止めて同期する
          if (executeSqlPromises.length % 100 === 0) {
            reader.pause();
            await Promise.all(executeSqlPromises);
            executeSqlPromises.splice(0);
            reader.resume();
          }
        }
      });
      reader.on('close', async () => {
        await Promise.all(executeSqlPromises);
        reader.close();
        insertSqlFileStream.close();
        resolve();
      });
    });
  }
  await pool.end();
}
